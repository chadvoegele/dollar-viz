//
// Copyright (c) 2015 Chad Voegele
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without modification,
// are permitted provided that the following conditions are met:
//
//  * Redistributions of source code must retain the above copyright notice, this
// list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright notice,
// this list of conditions and the following disclaimer in the documentation and/or
// other materials provided with the distribution.
//  * The name of Chad Voegele may not be used to endorse or promote products
// derived from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
// ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
// ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//

#include <stdexcept>
#include <cstring>
#include <climits>
#include <sstream>
#include <iostream>
#include <termios.h>
#include <sys/unistd.h>

#include "mhd.h"

namespace budget_charts {
  mhd::mhd(mhd_args& args, ::ledger_rest::logger& logger,
      ::budget_charts::responder& responder)
    : logger(logger), responder(responder), port(args.get_port()),
      key(args.get_key()), cert(args.get_cert()),
      client_cert(args.get_client_cert()), user_pass(args.get_user_pass()) {
    start_daemon(&daemon);
    if (NULL == daemon) {
      throw std::runtime_error("Could not create MHD daemon.");
    }
  }

  mhd::~mhd() {
    MHD_stop_daemon(daemon);
  }

  void mhd::run_from_select(const fd_set* read_fd_set, const fd_set* write_fd_set,
      const fd_set* except_fd_set) {
    int status = MHD_run_from_select(daemon, read_fd_set, write_fd_set, except_fd_set);

    if (status == MHD_NO)
      throw std::runtime_error("MHD run failed.");
  }

  int mhd::set_fdsets(fd_set* read_fd_set, fd_set* write_fd_set,
      fd_set* except_fd_set) {
    int max_fd;
    int status = MHD_get_fdset(daemon, read_fd_set, write_fd_set, except_fd_set,
        &max_fd);
    if (status == MHD_NO)
      throw std::runtime_error("Could not set fdsets.");
    return max_fd;
  }

  unsigned long long mhd::get_select_timeout() {
    unsigned long long timeout;
    int status = MHD_get_timeout(daemon, &timeout);
    if (status == MHD_NO)
      return ULLONG_MAX;
    else
      return timeout;
  }

  void mhd::start_daemon(struct MHD_Daemon** d) {
    if (cert.size() == 0 || key.size() == 0) {
      logger.log(5, "HTTP Mode");
      *d = MHD_start_daemon(MHD_NO_FLAG,
          port, NULL, NULL,
          &answer_callback_no_auth, this,
          MHD_OPTION_END);

    } else if (client_cert.size() == 0) {
      logger.log(5, "HTTPS Mode");
#if MHD_VERSION >= 0x00094001
      std::string key_pass(get_password());
#endif

      *d = MHD_start_daemon(MHD_USE_SSL,
          port, NULL, NULL,
          &answer_callback_auth, this,
          MHD_OPTION_HTTPS_MEM_CERT, cert.c_str(),
#if MHD_VERSION >= 0x00094001
          MHD_OPTION_HTTPS_KEY_PASSWORD, key_pass.c_str(),
#endif
          MHD_OPTION_HTTPS_MEM_KEY, key.c_str(),
          MHD_OPTION_HTTPS_CRED_TYPE, GNUTLS_CRD_CERTIFICATE,
          MHD_OPTION_NOTIFY_COMPLETED, &request_completed_callback, NULL,
          MHD_OPTION_END);

    } else {
      logger.log(5, "HTTPS Mode");
#if MHD_VERSION >= 0x00094001
      std::string key_pass(get_password());
#endif

      *d = MHD_start_daemon(MHD_USE_SSL,
          port, NULL, NULL,
          &answer_callback_auth, this,
          MHD_OPTION_HTTPS_MEM_CERT, cert.c_str(),
#if MHD_VERSION >= 0x00094001
          MHD_OPTION_HTTPS_KEY_PASSWORD, key_pass.c_str(),
#endif
          MHD_OPTION_HTTPS_MEM_KEY, key.c_str(),
          MHD_OPTION_HTTPS_CRED_TYPE, GNUTLS_CRD_CERTIFICATE,
          MHD_OPTION_HTTPS_MEM_TRUST, client_cert.c_str(),
          MHD_OPTION_NOTIFY_COMPLETED, &request_completed_callback, NULL,
          MHD_OPTION_END);
    }
  };

  int mhd::answer_callback_auth(void *cls,
      struct MHD_Connection* connection,
      const char* url,
      const char* method,
      const char* version,
      const char* upload_data,
      size_t* upload_data_size,
      void** con_cls) {
    int ret;

    if (*con_cls == NULL) {
      int* call_count = new int;
      *con_cls = call_count;
      *call_count = 0;
      return MHD_YES;

    } else {
      int* call_count = static_cast<int*>(*con_cls);
      *call_count++;

      const char *page  = "<html><body>Unauthorized</body></html>";
      struct MHD_Response* unauthorized_response =
        MHD_create_response_from_buffer(strlen(page), (void*)page, MHD_RESPMEM_PERSISTENT);

      mhd* mhd_obj = static_cast<mhd*>(cls);

      if (mhd_obj->client_cert.size() > 0 && !verify_certificate(mhd_obj, connection)) {
          ret = MHD_queue_response(connection, MHD_HTTP_UNAUTHORIZED, unauthorized_response);

      } else if (mhd_obj->user_pass.size() > 0 && !verify_user_pass(mhd_obj, connection)) {
          ret = MHD_queue_basic_auth_fail_response(connection, "", unauthorized_response);
      } else {
        http::request request(build_request(connection, url, method));
        http::response response(mhd_obj->responder.respond(request));

        const char* page = response.body.c_str();
        struct MHD_Response *mhd_response =
          MHD_create_response_from_buffer(strlen(page), (void*)page, MHD_RESPMEM_MUST_COPY);
        ret = MHD_queue_response(connection, response.status_code, mhd_response);
        MHD_destroy_response(mhd_response);

      }
      MHD_destroy_response(unauthorized_response);

    }

    return ret;
  }

  int mhd::answer_callback_no_auth(void *cls,
      struct MHD_Connection* connection,
      const char* url,
      const char* method,
      const char* version,
      const char* upload_data,
      size_t* upload_data_size,
      void** con_cls) {
    mhd* mhd_obj = static_cast<mhd*>(cls);
    http::request request(build_request(connection, url, method));
    http::response response(mhd_obj->responder.respond(request));

    const char* page = response.body.c_str();
    struct MHD_Response *mhd_response =
      MHD_create_response_from_buffer(strlen(page), (void*)page, MHD_RESPMEM_MUST_COPY);
    int ret = MHD_queue_response(connection, response.status_code, mhd_response);
    MHD_destroy_response(mhd_response);
    return ret;
  }

  bool mhd::verify_user_pass(mhd* mhd_obj, struct MHD_Connection* connection) {
    char* pass = NULL;
    char* user = MHD_basic_auth_get_username_password(connection, &pass);
    bool fail = (
        (user == NULL)
        || (mhd_obj->user_pass.find(std::string(user)) == mhd_obj->user_pass.end())
        || (pass == NULL)
        || (mhd_obj->user_pass.find(std::string(user))->second != std::string(pass)) );

    if (fail && (user != NULL && pass != NULL)) {
      std::stringstream s;
      s << "Failed user/pass login with" << std::endl;
      s << "user: " << user << std::endl;
      s << "pass: " << pass << std::endl;
      mhd_obj->logger.log(5, s.str());
    }

    if (user != NULL) free(user);
    if (pass != NULL) free(pass);

    return !fail;
  }

  bool mhd::verify_certificate(mhd* mhd_obj, struct MHD_Connection* connection) {
    gnutls_session_t tls_session;
    const union MHD_ConnectionInfo *ci;
    ci = MHD_get_connection_info(connection, MHD_CONNECTION_INFO_GNUTLS_SESSION);
    tls_session = (gnutls_session_t)ci->tls_session;

    if (tls_session == NULL) {
      mhd_obj->logger.log(5, "TLS session uninitialized!");
      return false;
    }

    gnutls_certificate_status_t client_cert_status;

    int status =
      gnutls_certificate_verify_peers2(tls_session, (unsigned int*)&client_cert_status);
    if (status != 0) {
      mhd_obj->logger.log(5, "Verify peers failed!");
      mhd_obj->logger.log(5, "Error was: ");
      mhd_obj->logger.log(5, gnutls_strerror(status));
      return false;
    }

    if (client_cert_status & GNUTLS_CERT_INVALID) {
      mhd_obj->logger.log(5, "Invalid certificate received!");

      if (client_cert_status & GNUTLS_CERT_SIGNER_NOT_FOUND)
        mhd_obj->logger.log(5, "  No issuer was found");
      if (client_cert_status & GNUTLS_CERT_SIGNER_NOT_CA)
        mhd_obj->logger.log(5, "  Issuer is not a CA");
      if (client_cert_status & GNUTLS_CERT_NOT_ACTIVATED)
        mhd_obj->logger.log(5, "  Not yet activated");
      if (client_cert_status & GNUTLS_CERT_EXPIRED)
        mhd_obj->logger.log(5, "  Expired");
      if (client_cert_status & GNUTLS_CERT_INSECURE_ALGORITHM)
        mhd_obj->logger.log(5, "  Insecure algorithm");
      if (client_cert_status & GNUTLS_CERT_SIGNATURE_FAILURE)
        mhd_obj->logger.log(5, "  Signature verification failed.");
      if (client_cert_status & GNUTLS_CERT_UNEXPECTED_OWNER)
        mhd_obj->logger.log(5, "  Unexpected owner.");
      if (client_cert_status & GNUTLS_CERT_MISMATCH)
        mhd_obj->logger.log(5, "  Ceritifcate unexpected.");

      unsigned int listsize;
      const gnutls_datum_t* pcert;
      pcert = gnutls_certificate_get_peers(tls_session, &listsize);
      if (pcert == NULL) {
        mhd_obj->logger.log(5, "Failed to retrieve client certificate chain.");
        return false;
      }

      gnutls_x509_crt_t client_cert;
      if (gnutls_x509_crt_init(&client_cert)) {
        mhd_obj->logger.log(5, "Failed to initialize client certificate.");
        return false;
      }

      log_client_cert_dn(pcert, client_cert, mhd_obj->logger);

      gnutls_x509_crt_deinit(client_cert);
      return false;
    }

    return true;
  }

  void mhd::log_client_cert_dn(const gnutls_datum_t* pcert, gnutls_x509_crt_t client_cert,
      ::ledger_rest::logger& logger) {
    if (gnutls_x509_crt_import(client_cert, &pcert[0], GNUTLS_X509_FMT_DER)) {
      logger.log(5, "Failed to import client certificate.");
      return;
    }

    char* buf;
    size_t lbuf = 0;
    gnutls_x509_crt_get_dn(client_cert, NULL, &lbuf);
    buf = (char*)malloc(lbuf);
    if (buf == NULL) {
      logger.log(5, "Failed to allocate memory for certificate dn.");
      return;
    }
    gnutls_x509_crt_get_dn(client_cert, buf, &lbuf);

    logger.log(5, "Certificate from: " + std::string(buf));
    free(buf);
  }

  void mhd::request_completed_callback(void *cls,
        struct MHD_Connection *connection,
        void **con_cls,
        enum MHD_RequestTerminationCode toe) {
    if (con_cls != NULL) {
      int* call_count = static_cast<int*>(*con_cls);
      delete call_count;
    }
  }

  template<typename K, typename T>
  std::map<K, T> mhd::convert_map(std::multimap<K, T> mmap) {
    typename std::map<K, T> map;

    typename std::multimap<K, T>::const_iterator iter;
    for (iter = mmap.cbegin(); iter != mmap.end(); iter++) {
      map.insert(std::make_pair(iter->first, iter->second));
    }

    return map;
  }

  std::multimap<std::string, std::string> mhd::get_values(struct MHD_Connection* connection,
      enum MHD_ValueKind kind) {
    std::multimap<std::string, std::string> values;
    MHD_get_connection_values(connection, kind, &key_value_collector, &values);
    return values;
  }

  int mhd::key_value_collector(void* cls, enum MHD_ValueKind kind, const char* key, const char* value) {
    std::multimap<std::string, std::string>* map
      = static_cast<std::multimap<std::string, std::string>*>(cls);
    if (key != NULL && value != NULL)
      map->insert(std::make_pair(std::string(key), std::string(value)));
    return MHD_YES;
  }

  std::map<std::string, std::string> mhd::get_headers(struct MHD_Connection* connection) {
    std::multimap<std::string, std::string> multi_headers
      = get_values(connection, MHD_ValueKind::MHD_HEADER_KIND);
    std::map<std::string, std::string> headers
      = mhd::convert_map(multi_headers);
    return headers;
  }

  std::multimap<std::string, std::string> mhd::get_uri_args(struct MHD_Connection* connection) {
    std::multimap<std::string, std::string> uri_args
      = get_values(connection, MHD_ValueKind::MHD_GET_ARGUMENT_KIND);
    return uri_args;
  }

  http::request mhd::build_request(struct MHD_Connection* connection,
      const char* url, const char* method) {
    std::map<std::string, std::string> headers
      = get_headers(connection);
    std::multimap<std::string, std::string> uri_args
      = get_uri_args(connection);
    http::request request(std::string(method), std::string(url),
        headers, uri_args);
    return request;
  }


  std::string mhd::get_password() {
    std::cout << "Enter key password: " << std::endl;
    struct termios old_term, new_term;

    tcgetattr(STDIN_FILENO, &old_term);
    new_term = old_term;
    new_term.c_lflag &= ~(ICANON | ECHO);
    tcsetattr(STDIN_FILENO, TCSANOW, &new_term);

    std::string pass;
    std::cin >> pass;

    tcsetattr(STDIN_FILENO, TCSANOW, &old_term);
    return pass;
  }
}

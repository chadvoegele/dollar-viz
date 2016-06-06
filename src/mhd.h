/* * Copyright (c) 2015 Chad Voegele
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 *  * Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation and/or
 * other materials provided with the distribution.
 *  * The name of Chad Voegele may not be used to endorse or promote products
 * derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

#pragma once

#include <map>
#include <string>
#include <microhttpd.h>
#include <gnutls/gnutls.h>
#include <gnutls/x509.h>

#include "logger.h"
#include "mhd_args.h"
#include "runnable.h"
#include "http.h"
#include "responder.h"

namespace budget_charts {
  class mhd : public runnable {
    public:
      mhd(mhd_args& args, ::ledger_rest::logger& logger, budget_charts::responder& responder);
      mhd(const mhd&) = delete;
      mhd& operator=(const mhd&) = delete;
      mhd (mhd&&) = delete;
      mhd& operator=(const mhd&&) = delete;
      virtual ~mhd();

      void run_from_select(const fd_set* read_fd_set, const fd_set* write_fd_set,
          const fd_set* except_fd_set);
      int set_fdsets(fd_set* read_fd_set, fd_set* write_fd_set, fd_set* except_fd_set);
      unsigned long long get_select_timeout();

      const int port;
      const std::string key;
      const std::string cert;
      const std::string client_cert;
      const std::unordered_map<std::string, std::string> user_pass;

    private:
      ::ledger_rest::logger& logger;
      budget_charts::responder& responder;
      struct MHD_Daemon* daemon;

      static int answer_callback_auth(void *cls,
          struct MHD_Connection* connection,
          const char* url,
          const char* method,
          const char* version,
          const char* upload_data,
          size_t* upload_data_size,
          void** con_cls);

      static int answer_callback_no_auth(void *cls,
          struct MHD_Connection* connection,
          const char* url,
          const char* method,
          const char* version,
          const char* upload_data,
          size_t* upload_data_size,
          void** con_cls);

      static void request_completed_callback(void *cls,
          struct MHD_Connection *connection,
          void **con_cls,
          enum MHD_RequestTerminationCode toe);

      static http::request build_request(struct MHD_Connection* connection,
          const char* url, const char* method);
      static std::map<std::string, std::string> get_headers(struct MHD_Connection* connection);
      static std::multimap<std::string, std::string> get_uri_args(struct MHD_Connection* connection);
      void start_daemon(struct MHD_Daemon** d);
      static bool verify_certificate(mhd* mhd_obj, struct MHD_Connection* connection);
      static bool verify_user_pass(mhd* mhd_obj, struct MHD_Connection* connection);
      static void log_client_cert_dn(const gnutls_datum_t* pcert, gnutls_x509_crt_t client_cert,
          ::ledger_rest::logger&);

      static std::multimap<std::string, std::string> get_values(
          struct MHD_Connection* connection, enum MHD_ValueKind kind);
      static int key_value_collector(void* cls, enum MHD_ValueKind kind, const char* key,
          const char* value);
      template<typename K, typename T>
        static std::map<K, T> convert_map(std::multimap<K, T> mmap);
      std::string get_password();
  };
}

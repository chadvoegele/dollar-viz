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
#include <list>

#include "args.h"
#include "file_reader.h"
#include "uri_parser.h"

const char *argp_program_version = "";
const char *argp_program_bug_address = "";

namespace budget_charts {
  args::args(int argc, char** argv) {
    struct argp_option options[] = {
      {"level",  'l', "log level",      0,  "Log level [0-9]. Higher numbers mean more logging." },
      {"file",  'f', "ledger file",      0,  "Leger file" },
      {"ledger_rest_prefix",  'e', "ledger rest prefix",      0,  "Prefix for ledger REST http queries. Default is /ledger_rest" },
      {"port",  'p', "port number",      0,  "Port for server to run on." },
      {"key",  'k', "private key file",      0,  "File containing private key for HTTPS." },
      {"cert",  'c', "certificate file",      0,  "Certificate used by HTTPS." },
      {"client_cert",  't', "client certificate file", 0, "Certificate used to validate client certs." },
      {"pass",  'u', "user/pass file",      0,  "File containing user:password in consecutive lines." },
      { 0 }
    };

    static char doc[] = "";
    static char args_doc[] = "";

    struct argp argp = { options, args::parse_opt, args_doc, doc };

    arguments.log_level = 0;
    arguments.ledger_file_path = std::string("");
    arguments.ledger_rest_prefix = std::string("ledger_rest");
    arguments.port = 80;
    arguments.key = std::string("");
    arguments.cert = std::string("");
    arguments.client_cert = std::string("");
    arguments.user_pass = std::unordered_map<std::string, std::string>{};

    argp_parse(&argp, argc, argv, 0, 0, &arguments);

    verify_options();
  }

  error_t args::parse_opt(int key, char *arg, struct argp_state *state) {
    struct arguments* arguments = static_cast<struct arguments*>(state->input);

    switch (key) {
      case 'l':
        {
          int log_level = std::stoi(std::string(arg));
          if (0 <= log_level && log_level <= 9) {
            arguments->log_level = std::stoi(std::string(arg));
          } else
            throw std::runtime_error("Invalid log level " + std::string(arg));
        }
        break;

      case 'f':
        {
          arguments->ledger_file_path = std::string(arg);
        }
        break;

      case 'p':
        {
          int port = std::stoi(std::string(arg));
          if (port <= 0 || port > 65535)
            throw std::runtime_error("Invalid port number" + std::string(arg));
          arguments->port = port;
        }
        break;

      case 'k':
        {
          std::string key = read_whole_file(std::string(arg));
          if (key == std::string("")) {
            throw std::runtime_error("Error reading key file: " + std::string(arg));
          }

          arguments->key = key;
        }
        break;

      case 'c':
        {
          std::string cert = read_whole_file(std::string(arg));
          if (cert == std::string("")) {
            throw std::runtime_error("Error reading cert file: " + std::string(arg));
          }

          arguments->cert = cert;
        }
        break;

      case 't':
        {
          std::string client_cert = read_whole_file(std::string(arg));
          if (client_cert == std::string("")) {
            throw std::runtime_error("Error reading client cert file: " + std::string(arg));
          }

          arguments->client_cert = client_cert;
        }
        break;

      case 'u':
        arguments->user_pass = load_user_pass(std::string(arg));
        break;

      case 'e':
        arguments->ledger_rest_prefix = std::string(arg);
        break;

      default:
        return ARGP_ERR_UNKNOWN;
    }
    return 0;
  }

  void args::verify_options() {
    if (arguments.ledger_file_path.size() == 0)
        throw std::runtime_error("Ledger file must be set!");

    if (arguments.cert.size() > 0 ^ arguments.key.size() > 0)
      throw std::runtime_error("HTTPS requires setting key and cert.");
  }

  int args::get_port() {
    return arguments.port;
  }

  int args::get_log_level() {
    return arguments.log_level;
  }

  std::string args::get_ledger_file_path() {
    return arguments.ledger_file_path;
  }

  std::string args::get_ledger_rest_prefix() {
    return arguments.ledger_rest_prefix;
  }

  std::string args::get_key() {
    return arguments.key;
  }

  std::string args::get_cert() {
    return arguments.cert;
  }

  std::string args::get_client_cert() {
    return arguments.client_cert;
  }

  std::unordered_map<std::string, std::string> args::get_user_pass() {
    return arguments.user_pass;
  }

  std::unordered_map<std::string, std::string> args::load_user_pass(std::string user_pass_file) {
    std::string data = read_whole_file(user_pass_file);
    if (data == std::string("")) {
      throw std::runtime_error("Error reading user/pass file: " + user_pass_file);
    }

    std::unordered_map<std::string, std::string> userpass;

    std::list<std::string> lines = split_string(data, std::string("\n"));
    std::list<std::string>::const_iterator iter;
    for (iter = lines.cbegin(); iter != lines.cend(); iter++) {
      if (iter->size() != 0) {
        std::list<std::string> parts = split_string(*iter, std::string(":"));
        if (parts.size() != 2) {
          throw std::runtime_error("Error reading line from user/pass file:\n" + *iter);

        } else {
          std::string user = parts.front();
          std::string pass = parts.back();
          if (userpass.find(user) == userpass.end())
            userpass.insert(std::make_pair(user, pass));
          else
            throw std::runtime_error("Password already defined for user: " + user);
        }
      }
    }
    return userpass;
  }
}


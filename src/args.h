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

#include <cstdio>
#include <string>
#include <unordered_map>
#include <argp.h>

#include "mhd_args.h"
#include "ledger_rest_args.h"

namespace budget_charts {
  class args : public ::ledger_rest::ledger_rest_args, public mhd_args {
    public:
      args(int argc, char** argv);
      virtual ~args() { }

      virtual int get_port();
      virtual int get_log_level();
      virtual std::string get_ledger_file_path();
      virtual std::string get_ledger_rest_prefix();
      virtual std::string get_key();
      virtual std::string get_cert();
      virtual std::string get_client_cert();
      virtual std::unordered_map<std::string, std::string> get_user_pass();

    protected:
      static error_t parse_opt(int key, char *arg, struct argp_state *state);
      static std::unordered_map<std::string, std::string> load_user_pass(std::string user_pass_file);
      void verify_options();

      struct arguments {
        int log_level;
        int port;
        std::string ledger_file_path;
        std::string ledger_rest_prefix;
        std::string key;
        std::string cert;
        std::string client_cert;
        std::unordered_map<std::string, std::string> user_pass;
      };

      struct arguments arguments;
  };
}

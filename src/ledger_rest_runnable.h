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

#include <unordered_map>

#include "ledger_rest_args.h"
#include "ledger_rest.h"
#include "logger.h"
#include "runnable.h"
#include "responder.h"

namespace budget_charts {
  class ledger_rest_runnable : public ::ledger_rest::ledger_rest, public runnable, public responder {
    public:
      ledger_rest_runnable(::ledger_rest::ledger_rest_args& args, ::ledger_rest::logger& logger);
      ledger_rest_runnable(const ledger_rest_runnable&) = delete;
      ledger_rest_runnable& operator=(const ledger_rest_runnable&) = delete;
      ledger_rest_runnable (ledger_rest_runnable&&) = delete;
      ledger_rest_runnable& operator=(const ledger_rest_runnable&&) = delete;
      virtual ~ledger_rest_runnable() { }

      virtual http::response respond(http::request request);
      virtual void run_from_select(const fd_set* read_fd_set, const fd_set* write_fd_set,
          const fd_set* except_fd_set);
      virtual int set_fdsets(fd_set* read_fd_set, fd_set* write_fd_set, fd_set* except_fd_set);
      virtual unsigned long long get_select_timeout();

    private:
      int update_fd, update_wd;
      void set_update_fd();
  };
}

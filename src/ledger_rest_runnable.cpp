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
#include <sys/inotify.h>
#include <sys/select.h>
#include <utility>

#include "ledger_rest_runnable.h"

namespace budget_charts {
  ledger_rest_runnable::ledger_rest_runnable(::ledger_rest::ledger_rest_args& args,
      ::ledger_rest::logger& logger)
    : ::ledger_rest::ledger_rest(args, logger) {
      set_update_fd();
  }

  http::response ledger_rest_runnable::respond(http::request request) {
    return ::ledger_rest::ledger_rest::respond(request);
  }

  void ledger_rest_runnable::run_from_select(const fd_set* read_fd_set,
      const fd_set* write_fd_set, const fd_set* except_fd_set) {
    if (FD_ISSET(update_fd, read_fd_set)) {
      ::ledger_rest::ledger_rest::reset_journal();
      close(update_fd);
      set_update_fd();
    }
  }

  int ledger_rest_runnable::set_fdsets(fd_set* read_fd_set,
      fd_set* write_fd_set, fd_set* except_fd_set) {
    if (update_fd != -1) {
      FD_SET(update_fd, read_fd_set);
    }
    return update_fd;
  }

  unsigned long long ledger_rest_runnable::get_select_timeout() {
    return 1000LL * 60LL * 60LL;
  }

  void ledger_rest_runnable::set_update_fd() {
    update_fd = inotify_init();
    if (update_fd != -1) {
      update_wd = inotify_add_watch(update_fd, ledger_file.c_str(), IN_MODIFY);
    } else {
      lr_logger.log(5, "Could not create ledger file update fd.");
    }
  }
}

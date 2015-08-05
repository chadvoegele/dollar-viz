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

#include <climits>
#include <csignal>

#include "runner.h"

namespace budget_charts {
  void runner::run() {
    sigset_t emptyset;
    sigemptyset(&emptyset);

    struct timespec tv;
    fd_set rs;
    fd_set ws;
    fd_set es;
    int max_fd, max_fd_t;
    unsigned long long timeout, timeout_t;
    std::list<runnable*>::iterator iter;
    int nready;

    logger.log(0, "Starting server");
    while (is_running) {
      timeout = ULLONG_MAX;
      max_fd = -1;
      FD_ZERO(&rs);
      FD_ZERO(&ws);
      FD_ZERO(&es);

      for (iter = runners.begin(); iter != runners.end(); iter++) {
        max_fd_t = (*iter)->set_fdsets(&rs, &ws, &es);
        if (max_fd_t > max_fd)
          max_fd = max_fd_t;
        timeout_t = (*iter)->get_select_timeout();
        if (timeout_t < timeout)
          timeout = timeout;
      }

      convert_timeout(timeout, tv);
      nready = pselect(max_fd + 1, &rs, &ws, &es, &tv, &emptyset);
      if (nready > 0 || errno != EINTR) {
        for (iter = runners.begin(); iter != runners.end(); iter++) {
          (*iter)->run_from_select(&rs, &ws, &es);
        }
      }
    }
  }

  void runner::stop() {
    logger.log(0, "Stopping server");
    is_running = false;
  }

  void runner::convert_timeout(unsigned long long& timeout,
      timespec& tv) {
    tv.tv_sec = timeout / 1000LL;
    tv.tv_nsec = (timeout - (tv.tv_sec * 1000LL)) * 1000000LL;
  }
}

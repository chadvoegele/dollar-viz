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

#include <cstdlib>
#include <list>
#include <unordered_map>

#include "args.h"
#include "runner.h"
#include "mhd.h"
#include "ledger_rest_runnable.h"
#include "file_responder.h"
#include "runnable.h"
#include "stderr_logger.h"
#include "dispatcher.h"
#include "signal_handler.h"

int main(int argc, char** argv) {
  budget_charts::args args(argc, argv);

  ledger_rest::stderr_logger logger(args.get_log_level());
  budget_charts::ledger_rest_runnable ledger(args, logger);
  budget_charts::file_responder file(logger);

  std::unordered_map<std::string, budget_charts::responder*> responders;
  ledger.register_responder(responders);
  file.register_responder(responders);
  budget_charts::dispatcher dispatcher(responders);

  budget_charts::mhd mhd(args, logger, dispatcher);

  std::list<budget_charts::runnable*> runners{ &mhd, &ledger };
  budget_charts::runner runner(logger, runners);

  budget_charts::set_runner(&runner);
  if (std::signal(SIGINT, budget_charts::stop_runner) == SIG_ERR) {
    logger.log(5, "Error setting signal handler.");
    exit(EXIT_FAILURE);
  }

  runner.run();
  return 0;
}
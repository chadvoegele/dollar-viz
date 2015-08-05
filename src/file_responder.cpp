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

#include <string>
#include <map>

#include "file_responder.h"
#include "file_reader.h"

namespace budget_charts {
  file_responder::file_responder(::ledger_rest::logger& logger) : logger(logger) { }

  void file_responder::register_responder(
      std::unordered_map<std::string, responder*>& responders) {
    responders.insert(std::make_pair(std::string(""), this));
  }

  http::response file_responder::respond(http::request request) {
    if (request.url == std::string("/")) {
      http::request index(request.method, std::string("index.html"),
          request.headers, request.uri_args);
      return file_responder::respond(index);
    }

    std::string requested_path = std::string("www/") + request.url;
    std::string file = read_whole_file(requested_path);

    if (file.size() == 0) {
      std::string page404 = read_whole_file(std::string("www/404.html"));
      http::response not_found(http::status_code::NOT_FOUND, page404,
          std::map<std::string, std::string>());
      return not_found;

    } else {
      http::response success(http::status_code::OK, file,
          std::map<std::string, std::string>());
      return success;
    }
  }
}

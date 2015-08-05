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

namespace http {
  enum status_code {
    CONTINUE = 100,
    OK = 200,
    NOT_MODIFIED = 304,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    METHOD_NOT_ALLOWED = 405,
    INTERNAL_SERVER_ERROR = 500,
  };

  class request final {
    public:
      const std::string method;
      const std::string url;
      const std::map<std::string, std::string> headers;
      const std::multimap<std::string, std::string> uri_args;

      request(std::string method,
          std::string url,
          std::map<std::string, std::string> headers,
          std::multimap<std::string, std::string> uri_args)
          : method(method), url(url), headers(headers), uri_args(uri_args) { }
      request(const request& other) : method(other.method), url(other.url),
        headers(other.headers), uri_args(other.uri_args) { }
      request& operator=(const request& other) = delete;
      ~request() = default;

      std::string to_string();
  };

  class response final {
    public:
      const int status_code;
      const std::string body;
      const std::map<std::string, std::string> headers;

      response(int status_code,
          std::string body,
          std::map<std::string, std::string> headers)
          : status_code(status_code), body(body), headers(headers) { }
      response(const response& other) : status_code(other.status_code),
        body(other.body), headers(other.headers) { }
      response& operator=(const response& other) = delete;
      ~response() = default;
  };
}

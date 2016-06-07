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

#include <list>
#include <thread>
#include <gtest/gtest.h>
#include <curl/curl.h>

#include "mhd.h"
#include "mhd_args.h"
#include "responder.h"
#include "http.h"
#include "runnable.h"
#include "runner.h"

#include "black_hole_logger.h"

class magnet_responder : public budget_charts::responder {
    public:
      http::response respond(http::request request) {
        this->request = new http::request(request);

        http::response res(http::status_code::OK, std::string(""),
            std::map<std::string, std::string>());
        return res;
      }

      http::request get_request() {
        return *request;
      }

      virtual ~magnet_responder() {
        if (request != NULL)
          delete request;
      }

    private:
      http::request* request = NULL;
};

class predef_mhd_args : public ::budget_charts::mhd_args {
    public:
      virtual bool get_secure() {
        return false;
      }

      virtual int get_port() {
        return 8080;
      }

      virtual std::string get_key() {
        return std::string("");
      }

      virtual std::string get_key_pass() {
        return std::string("");
      }

      virtual std::string get_cert() {
        return std::string("");
      }

      virtual std::string get_client_cert() {
        return std::string("");
      }

      virtual std::unordered_map<std::string, std::string> get_user_pass() {
        return std::unordered_map<std::string, std::string>{ };
      }
};

bool requests_equal(http::request a,
    http::request b) {
  if (a.method != b.method)
    return false;
  if (a.url != b.url)
    return false;
  if (a.headers != b.headers)
    return false;
  if (a.uri_args != b.uri_args)
    return false;

  return true;
}

void run_mhd_request_test(std::string url,
    http::request expected) {
  magnet_responder mr;
  predef_mhd_args args;
  black_hole_logger logger;
  budget_charts::mhd mhd(args, logger, mr);

  std::list<budget_charts::runnable*> runners{ &mhd };
  budget_charts::runner runner(logger, runners);

  std::function<void()> run_server_fn = [&]() { runner.run(); };
  std::thread t(run_server_fn);

  CURL* curl = curl_easy_init();
  curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
  curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT, 1);
  CURLcode code = curl_easy_perform(curl);
  curl_easy_cleanup(curl);

  runner.stop();
  t.join();

  http::request actual(mr.get_request());

  ASSERT_TRUE(requests_equal(actual, expected));
}

TEST(mhd_tests, send_request_test) {
  http::request request(std::string("GET"),
      std::string("/a/b/c"),
      std::map<std::string, std::string> { {"Accept", "*/*"}, { "Host", "localhost:8080"} },
      std::multimap<std::string, std::string> { {"arg", "value"} }
      );
  run_mhd_request_test("http://localhost:8080/a/b/c?arg=value",
      request);
}

TEST(mhd_tests, send_request_test2) {
  http::request request(std::string("GET"),
      std::string("/a/b/c"),
      std::map<std::string, std::string> { {"Accept", "*/*"}, { "Host", "localhost:8080"} },
      std::multimap<std::string, std::string> { {"arg", "value"}, {"arg", "value2"},
        {"arg2", "cat"} }
      );
  run_mhd_request_test("http://localhost:8080/a/b/c?arg=value&arg=value2&arg2=cat",
      request);
}

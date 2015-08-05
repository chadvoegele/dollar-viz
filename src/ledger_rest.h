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

#include <string>
#include <list>
#include "boost/date_time/gregorian/gregorian.hpp"

#include "ledger_rest_args.h"
#include "logger.h"
#include "http.h"
#include "ledger_includes.h"

namespace ledger_rest {
  class ledger_rest {
    public:
      ledger_rest(ledger_rest_args& args, logger& logger);
      ledger_rest(const ledger_rest&) = delete;
      ledger_rest& operator=(const ledger_rest&) = delete;
      ledger_rest (ledger_rest&&) = delete;
      ledger_rest& operator=(const ledger_rest&&) = delete;
      virtual ~ledger_rest() { }

      struct post_result {
        double amount = 0;
        boost::gregorian::date date;
        std::string account_name;
      };

      std::list<post_result> run_register(std::list<std::string> args,
          std::list<std::string> query);
      static std::string to_json(post_result posts);
      static std::string to_json(std::list<post_result> posts);

      std::list<std::string> get_accounts();
      static std::string to_json(std::list<std::string> accounts);

      virtual http::response respond(http::request request);

      const std::string ledger_file;

    protected:
      logger& lr_logger;
      std::shared_ptr<ledger::session_t> session_ptr;
      ledger::empty_scope_t empty_scope;
      bool is_file_loaded;
      std::string http_prefix;

      template<typename T>
      static std::string to_json(std::list<T> x, std::function<std::string(T)>);
      virtual http::response respond_or_throw(http::request request);
      void reset_journal();

      class post_capturer : public ledger::item_handler<ledger::post_t> {
        public:
          post_capturer() : ledger::item_handler<ledger::post_t>() { }
          virtual ~post_capturer() { }
          virtual void flush( ) { }
          ledger::value_t get_amount(ledger::post_t& post);
          virtual void operator()(ledger::post_t& post);
          virtual void clear();
          std::list<post_result> get_post_results();

        private:
          std::list<post_result> result_capture;
      };

      class account_capturer : public ledger::item_handler<ledger::account_t> {
        public:
          account_capturer() : ledger::item_handler<ledger::account_t>() { }
          virtual ~account_capturer() { }
          virtual void flush( ) { }
          virtual void operator()(ledger::account_t& account);
          virtual void clear();
          std::list<std::string> get_account_results();

        private:
          std::list<std::string> result_capture;
      };
  };
}

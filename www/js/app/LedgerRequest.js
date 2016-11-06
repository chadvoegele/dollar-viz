/*
 * Copyright (c) 2015 Chad Voegele
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

function LedgerRequest(query, frequency, start_date, end_date, budget, collapse) {
  this.query = query;
  this.frequency = frequency;
  this.start_date = start_date;
  this.end_date = end_date;
  this.budget = budget;
  this.collapse = collapse;
}

LedgerRequest.prototype.base_url = '/ledger_rest/report/register';

LedgerRequest.prototype.to_request_object = function() {
  var args = [
    '--empty',
    '--market',
    '--no-revalued',
    '--period',
    build_period(this.frequency, this.start_date, this.end_date)
  ];

  // Use either:
  // 1. --collapse + (--add-budget)
  // 2. (--actual) + --add-budget
  if (this.collapse) {
    args.push('--collapse');

    if (this.budget) {
      args.push('--add-budget');
    }
  } else {
    args.push('--add-budget');

    if (!this.budget) {
      args.push('--actual');
    }
  }

  return {
    args: args,
    query: this.query
  };
}

LedgerRequest.prototype.build_url = function() {
  var request = this.to_request_object();

  var url_args = request.args
    .map(function (s) { return "args=" + s; })
    .join("&");

  var url_query = request.query
    .map(function(s){ return "query=" + s; })
    .join("&");

  var url = this.base_url + '?' + url_args + '&' + url_query;

  return url;
}

function date_to_string(date, separator) {
  if (separator === undefined) {
    separator = "/";
  }

  var date_str = date.getFullYear() + separator
                 + (1 + date.getMonth()) + separator
                 + date.getDate();

  return date_str;
}

function build_period(frequency, start_date, end_date) {
  var period = frequency;
  if (start_date !== undefined)
    period = period + " from " + date_to_string(start_date);
  if (end_date !== undefined)
    period = period + " to " + date_to_string(end_date);
  return period;
}

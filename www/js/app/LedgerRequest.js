/*
 * Copyright (c) 2015-2022 Chad Voegele
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

export function LedgerRequest (options) {
  this.query = options.query
  this.frequency = options.frequency
  this.start_date = options.start_date
  this.end_date = options.end_date
  this.args = options.args
}

LedgerRequest.prototype.base_url = '/ledger_rest/report/register'

LedgerRequest.prototype.to_request_object = function () {
  const args = this.args || []

  const period = build_period(this.frequency, this.start_date, this.end_date)
  if (period.length > 0) {
    args.push('--period')
    args.push(period)
  }

  return {
    args,
    query: this.query
  }
}

LedgerRequest.prototype.build_url = function () {
  const request = this.to_request_object()

  const url_args = request.args
    .map(function (s) { return 'args=' + s })
    .join('&')

  const url_query = request.query
    .map(function (s) { return 'query=' + s })
    .join('&')

  const url = this.base_url + '?' + url_args + '&' + url_query

  return url
}

function date_to_string (date, separator) {
  if (separator === undefined) {
    separator = '/'
  }

  const date_str = date.getFullYear() + separator +
                 (1 + date.getMonth()) + separator +
                 date.getDate()

  return date_str
}

function build_period (frequency, start_date, end_date) {
  const p = (frequency || '') +
    ((start_date && ' from ' + date_to_string(start_date)) || '') +
    ((end_date && ' to ' + date_to_string(end_date)) || '')
  return p
}

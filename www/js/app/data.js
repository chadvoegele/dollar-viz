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

export const data = {}

data.single_json_callback = function (expected_response_count, convos, request, callback,
  error, json) {
  if (error) {
    console.warn(error)
  } else if (json.length === 0) {
    console.warn('No data received.')
  }
  convos.push({ request, response: json })
  if (convos.length === expected_response_count) {
    callback(convos)
  }
}

data.multi_json = function (requests, callback) {
  const convos = []
  requests.forEach(function (request) {
    d3.json(request.build_url(), function (error, json) {
      return data.single_json_callback(requests.length, convos, request, callback,
        error, json)
    })
  })
}

data.convert_response_date = function (convos) {
  convos.response.forEach(function (d) {
    d.date = new Date(d.date)
  })
  return convos
}

data.mode = function (d) {
  const counts = []
  let i

  for (i = 0; i < d.length; i++) {
    const x = d[i]
    if (counts[x] === undefined) {
      counts[x] = 0
    } else {
      counts[x] = counts[x] + 1
    }
  }

  let max_key
  const keys = Object.keys(counts)
  let max_key_count = 0
  for (i = 0; i < keys.length; i++) {
    const key = keys[i]
    if (counts[key] > max_key_count) {
      max_key_count = counts[key]
      max_key = key
    }
  }

  return max_key
}

data.get_chart_data_name = function (convo) {
  if (convo.response.length > 0) {
    let most_common_account = data.mode(
      convo.response.filter(function (d) { return Math.abs(d.amount) > 0 })
        .map(function (d) { return d.account_name })
    )
    if (most_common_account === undefined) {
      most_common_account = ''
    }

    if (convo.request.budget) {
      return 'Budget for ' + most_common_account
    } else {
      return most_common_account
    }
  } else {
    return ''
  }
}

data.get_chart_data_style = function (convo) {
  if (convo.request.budget) {
    return 'budget_line'
  } else {
    return 'register_line'
  }
}

data.convo_to_chart_data = function (convo) {
  const chart_data = {
    name: data.get_chart_data_name(convo),
    style: data.get_chart_data_style(convo),
    d: convo.response,
    get_x: function (d) { return d.date },
    get_y: function (d) { return d.amount },
    is_budget: convo.request.budget
  }
  return chart_data
}

data.union_sort = function (a, b, compare) {
  const joined_sorted = a.concat(b).sort(compare)
  const reduce_fn = function (agg, value, index, array) {
    if (agg.length === 0) {
      agg.push(value)
    } else {
      const last_value = agg[agg.length - 1]
      if (compare(last_value, value) !== 0) {
        agg.push(value)
      }
    }
    return agg
  }
  const unique_sorted = joined_sorted.reduce(reduce_fn, [])
  return unique_sorted
}

data.align_to_dates = function (all_dates, response) {
  const default_account = data.mode(response.map(function (d) { return d.account_name }))

  const aligned_response = []
  let all_index = 0
  while (all_dates[all_index].getTime() < response[0].date.getTime()) {
    aligned_response.push({
      amount: 0,
      date: all_dates[all_index],
      account: default_account
    })
    all_index = all_index + 1
  }

  let response_index = 0
  while (all_index < all_dates.length &&
         all_dates[all_index].getTime() <= response[response.length - 1].date.getTime()) {
    if (all_dates[all_index].getTime() === response[response_index].date.getTime()) {
      aligned_response.push(response[response_index])
      response_index = response_index + 1
      all_index = all_index + 1
    } else {
      while (all_dates[all_index].getTime() < response[response_index].date.getTime()) {
        aligned_response.push({
          amount: 0,
          date: all_dates[all_index],
          account: default_account
        })
        all_index = all_index + 1
      }
    }
  }

  while (all_index < all_dates.length) {
    aligned_response.push({
      amount: 0,
      date: all_dates[all_index],
      account: default_account
    })
    all_index = all_index + 1
  }

  return aligned_response
}

data.calculate_budget = function (convos) {
  let budget
  let no_budget
  if (convos.length !== 2) {
    console.warn('Budget calculation should only have register and add-budget!')
    return []
  } else {
    if (convos[0].request.budget &&
        !convos[1].request.budget) {
      budget = convos[0]
      no_budget = convos[1]
    } else if (!convos[0].request.budget &&
                 convos[1].request.budget) {
      no_budget = convos[0]
      budget = convos[1]
    } else {
      console.warn('Budget calculation should exactly have register and add-budget!')
      return []
    }
    const date_accessor = function (d) { return d.date }
    const all_dates = data.union_sort(budget.response.map(date_accessor),
      no_budget.response.map(date_accessor),
      function (a, b) { return a.getTime() - b.getTime() })
    budget.response = data.align_to_dates(all_dates, budget.response)
    no_budget.response = data.align_to_dates(all_dates, no_budget.response)

    // ledger returns add-budget = register - budget.
    // recover original budget as budget = register - add-budget.
    // dates are already aligned by align_to_dates.
    for (let i = 0; i < budget.response.length; i++) {
      budget.response[i].amount = no_budget.response[i].amount - budget.response[i].amount
    }

    return [budget, no_budget]
  }
}

data.accumulate = function (convo) {
  let running_total = 0
  convo.response.forEach(function (d) {
    running_total = running_total + d.amount
    d.amount = running_total
  })
  return convo
}

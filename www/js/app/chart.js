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

// Many thanks to:
//   http://bl.ocks.org/mbostock/3883245
//   http://www.d3noob.org/2013/01/adding-grid-lines-to-d3js-graph.html
//   http://bl.ocks.org/syntagmatic/4053096
//   https://www.safaribooksonline.com/blog/2014/03/11/solving-d3-label-placement-constraint-relaxing/

import '../../css/chart.css'
import { Cache } from './cache'
import { ChartRequest } from './ChartRequest'
import { data } from './data'
import { plot } from './plot'

const cache = new Cache()
export const chart = {}

chart.setup_page = function () {
  chart.setup_typeahead()
  chart.setup_datepicker()
  chart.setup_graph()
  chart.setup_more_options_collapse()
  chart.setup_uri_args()
  window.onresize = function () { chart.resize_graph() }
  document.getElementById('accumulate').addEventListener('change', function () { chart.update_timeout() })
  document.getElementById('budget').addEventListener('change', function () { chart.update_timeout() })
  document.getElementById('frequency').addEventListener('change', function () { chart.update_timeout() })
  document.getElementById('query').addEventListener('input', function () { chart.update_timeout() })
}

chart.setup_typeahead = function () {
  const accounts = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.whitespace,
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    prefetch: {
      url: '/ledger_rest/accounts',
      cache: false
    }
  })

  $('.typeahead').typeahead(null, {
    name: 'accounts',
    source: accounts
  })

  $('.typeahead').on('typeahead:selected', function (e, i) { chart.update_timeout() })

  $('#query').tooltip()
}

chart.default_start_date = function () {
  const before_today = new Date(Date.now())
  before_today.setFullYear(before_today.getFullYear() - 5)
  return before_today
}

chart.default_end_date = function () {
  const today = new Date(Date.now())
  return today
}

chart.setup_datepicker = function () {
  $('.datepicker').datepicker({})
    .on('changeDate', function (e) { chart.update_timeout() })
  $('#start_date.datepicker').datepicker('setDate', chart.default_start_date())
  $('#end_date.datepicker').datepicker('setDate', chart.default_end_date())
}

chart.get_window_properties = function () {
  const window_properties = {
    width: window.innerWidth,
    height: window.innerHeight
  }
  return window_properties
}

chart.setup_graph = function () {
  const properties = chart.get_window_properties()
  const options_width = $('#query_options_div').width()
  const options_height = $('#query_options_div').height()
  let graph_width = Math.round(options_width * 1.2)
  let graph_height = Math.round(properties.height - options_height - 20)

  if (graph_width < 600 || graph_height < 300) {
    graph_width = 600
    graph_height = 300
  }

  d3.select('#the_graph')
    .attr('width', graph_width)
    .attr('height', graph_height)
}

chart.setup_more_options_collapse = function () {
  document.getElementById('collapse_more_options_link').onclick = function () {
    if (this.text === 'More options \u25C0') {
      this.text = 'More options \u25BC'
    } else {
      this.text = 'More options \u25C0'
    }
  }
  $('#collapse_more_options').on('hidden.bs.collapse', function () {
    chart.resize_graph()
  })
  $('#collapse_more_options').on('shown.bs.collapse', function () {
    chart.resize_graph()
  })
}

chart.setup_uri_args = function () {
  const fieldIds = ['query',
    'frequency',
    'start_date',
    'end_date',
    'budget',
    'accumulate'
  ]
  fieldIds.forEach(function (f) {
    Arg(f)
    $('#' + f).val(Arg(f))
  })
}

chart.resize_graph = function () {
  chart.setup_graph()
  chart.plot_register()
}

chart.plot_callback = function (filter_chain, convos) {
  const data = filter_chain(convos)
  cache.set_data(data, 'data')
  chart.plot_register()
}

chart.get_graph_dimensions = function () {
  const svg = d3.select('#the_graph')
  const height = svg.attr('height')
  const width = svg.attr('width')
  return { height, width }
}

chart.plot_register = function () {
  const svg = d3.select('#the_graph')
  const dims = chart.get_graph_dimensions()
  if (cache.get_data('data') !== undefined) {
    plot.plot_data(svg, cache.get_data('data'),
      plot.build_plot_config(dims.height, dims.width, 500))
  }
}

chart.parse_date_or_undefined = function (date_str) {
  const date = date_str.length > 0 ? new Date(date_str) : undefined
  return date
}

chart.auto_frequency = function (start_date, end_date) {
  if (start_date === undefined) {
    start_date = chart.default_start_date()
  }
  if (end_date === undefined) {
    end_date = new Date(Date.now())
  }

  // (millis / sec) (sec / min) (min / hour) (hour / day)
  const milliseconds_in_day = 1000 * 60 * 60 * 24
  const days_in_range = (end_date.valueOf() - start_date.valueOf()) / milliseconds_in_day

  // one point every 25 pixels
  // (days / point) = (days) / (width px) * (25 px / point)
  const dims = chart.get_graph_dimensions()
  const day_frequency = Math.ceil(days_in_range / dims.width * 25)
  let frequency
  if (day_frequency < 25) {
    frequency = 'weekly'
  } else if (day_frequency >= 26 && day_frequency < 70) {
    frequency = 'monthly'
  } else if (day_frequency >= 70 && day_frequency < 300) {
    frequency = 'quarterly'
  } else {
    frequency = 'yearly'
  }

  return frequency
}

chart.update_timeout = function () {
  const timeout_millis = 250
  const timeout_id = cache.get_data('timeout')
  if (timeout_id !== undefined) {
    window.clearTimeout(timeout_id)
  }
  cache.set_data(window.setTimeout(chart.update, timeout_millis), 'timeout')
}

chart.update = function () {
  const query = document.getElementById('query').value
  let frequency = document.getElementById('frequency').value
  const start_date = chart.parse_date_or_undefined(document.getElementById('start_date').value)
  const end_date = chart.parse_date_or_undefined(document.getElementById('end_date').value)
  const budget = document.getElementById('budget').checked
  const accumulate = document.getElementById('accumulate').checked

  const args = ['--empty', '--market', '--no-revalued', '--collapse']
  if (budget) {
    args.push('--add-budget')
  }

  if (query !== '') {
    if (frequency === 'auto') {
      frequency = chart.auto_frequency(start_date, end_date)
    }

    const query_parts = query.trim().split(' ')
    const chart_request = new ChartRequest({
      query: query_parts,
      frequency,
      start_date,
      end_date,
      args,
      accumulate,
      budget
    })
    const requests = chart.build_ledger_requests(chart_request)
    const filter_chain = chart.build_filter_chain(chart_request)

    data.multi_json(requests, function (convos) { chart.plot_callback(filter_chain, convos) })
  }
}

chart.build_ledger_requests = function (chart_request) {
  if (chart_request.budget === false) {
    return [chart_request]
  } else {
    const args = ['--empty', '--market', '--no-revalued', '--collapse']
    const no_budget_request = new ChartRequest({
      query: chart_request.query,
      frequency: chart_request.frequency,
      start_date: chart_request.start_date,
      end_date: chart_request.end_date,
      args,
      accumulate: chart_request.accumulate,
      budget: false
    })
    return [chart_request, no_budget_request]
  }
}

chart.build_filter_chain = function (chart_request) {
  return function (convos) {
    if (convos.every(function (c) { return c.response && c.response.length > 0 })) {
      convos = convos.map(data.convert_response_date)
      if (chart_request.budget) {
        convos = data.calculate_budget(convos)
      }
      if (chart_request.accumulate) {
        convos = convos.map(data.accumulate)
      }
      return convos.map(data.convo_to_chart_data)
    }
  }
}

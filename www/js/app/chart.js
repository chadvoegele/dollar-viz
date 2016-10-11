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

// Many thanks to:
//   http://bl.ocks.org/mbostock/3883245
//   http://www.d3noob.org/2013/01/adding-grid-lines-to-d3js-graph.html
//   http://bl.ocks.org/syntagmatic/4053096
//   https://www.safaribooksonline.com/blog/2014/03/11/solving-d3-label-placement-constraint-relaxing/

var cache = new Cache();
var chart = {};

chart.setup_page = function () {
  chart.setup_typeahead();
  chart.setup_datepicker();
  chart.setup_graph();
  chart.setup_more_options_collapse();
  chart.setup_uri_args();
  window.onresize = function() { chart.resize_graph(); };
}

chart.setup_typeahead = function () {
  var accounts = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.whitespace,
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    prefetch: {
      url: "/ledger_rest/accounts",
      cache: false
    }
  });

  $(".typeahead").typeahead(null, {
    name: "accounts",
    source: accounts
  });

  $(".typeahead").on("typeahead:selected", function(e,i) {chart.update_timeout();});

  $("#query").tooltip();
}

chart.default_start_date = function () {
  var before_today = new Date(Date.now());
  before_today.setFullYear(before_today.getFullYear() - 5);
  return before_today;
}

chart.setup_datepicker = function () {
  $(".datepicker").datepicker({})
  .on("changeDate", function(e) { chart.update_timeout(); });
  $("#start_date.datepicker").datepicker("setDate", chart.default_start_date());
}

chart.get_window_properties = function () {
  var window_properties = {
    width: window.innerWidth,
    height: window.innerHeight
  }
  return window_properties;
}

chart.setup_graph = function () {
  var properties = chart.get_window_properties();
  var options_width = $("#query_options_div").width();
  var options_height = $("#query_options_div").height();
  var graph_width = Math.round(options_width * 1.2);
  var graph_height = Math.round(properties.height - options_height - 20);

  if (graph_width < 600 || graph_height < 300) {
    graph_width = 600;
    graph_height = 300;
  }

  var svg = d3.select("#the_graph")
  .attr("width", graph_width)
  .attr("height", graph_height);
}

chart.setup_more_options_collapse = function () {
  document.getElementById("collapse_more_options_link").onclick = function() {
    if (this.text === "More options \u25C0")
      this.text = "More options \u25BC";
    else
      this.text = "More options \u25C0";
  };
  $("#collapse_more_options").on("hidden.bs.collapse", function() {
    chart.resize_graph();
  });
  $("#collapse_more_options").on("shown.bs.collapse", function() {
    chart.resize_graph();
  });
}

chart.setup_uri_args = function() {
  var fieldIds = [ 'query',
    'frequency',
    'start_date',
    'end_date',
    'budget',
    'accumulate' ];
  fieldIds.forEach(function (f) {
    Arg(f) && $('#' + f).val(Arg(f));
  });
};

chart.resize_graph = function () {
  chart.setup_graph();
  chart.plot_register();
}

chart.plot_callback = function (filter_chain, convos) {
  var data = filter_chain(convos);
  cache.set_data(data, 'data');
  chart.plot_register();
}

chart.get_graph_dimensions = function () {
  var svg = d3.select("#the_graph");
  var height = svg.attr("height");
  var width = svg.attr("width");
  return { height: height, width: width };
}

chart.plot_register = function () {
  var svg = d3.select("#the_graph");
  var dims = chart.get_graph_dimensions();
  if (cache.get_data('data') !== undefined)
    plot.plot_data(svg, cache.get_data('data'),
         plot.build_plot_config(dims.height, dims.width, 500));
}

chart.parse_date_or_undefined = function (date_str) {
  var date = date_str.length > 0
    ? new Date(date_str)
    : undefined;
  return date;
}

chart.auto_frequency = function (start_date, end_date) {
  if (start_date === undefined)
    start_date = chart.default_start_date();
  if (end_date === undefined)
    end_date = new Date(Date.now());

  // (millis / sec) (sec / min) (min / hour) (hour / day)
  var milliseconds_in_day = 1000*60*60*24;
  var days_in_range = (end_date.valueOf() - start_date.valueOf())
                      /milliseconds_in_day;

  // one point every 25 pixels
  // (days / point) = (days) / (width px) * (25 px / point)
  var dims = chart.get_graph_dimensions();
  var day_frequency = Math.ceil(days_in_range / dims.width * 25);
  if (day_frequency < 25)
    var frequency = "weekly";
  else if (26 <= day_frequency && day_frequency < 70)
    var frequency = "monthly";
  else if (70 <= day_frequency && day_frequency < 300)
    var frequency = "quarterly";
  else
    var frequency = "yearly";

  return frequency;
}

chart.update_timeout = function () {
  var timeout_millis = 250;
  var timeout_id = cache.get_data('timeout');
  if (timeout_id !== undefined)
    window.clearTimeout(timeout_id);
  cache.set_data(window.setTimeout(chart.update, timeout_millis), 'timeout');
}

chart.update = function () {
  var query = document.getElementById("query").value;
  var frequency = document.getElementById("frequency").value;
  var start_date = chart.parse_date_or_undefined(document.getElementById("start_date").value);
  var end_date = chart.parse_date_or_undefined(document.getElementById("end_date").value);
  var budget = document.getElementById("budget").checked;
  var accumulate = document.getElementById("accumulate").checked;

  if (query !== "") {
    if (frequency === "auto")
      frequency = chart.auto_frequency(start_date, end_date);

    var query_parts = query.trim().split(" ");
    var chart_request = new ChartRequest(query_parts, frequency, start_date,
      end_date, budget, true, accumulate);
    var requests = chart.build_ledger_requests(chart_request);
    var filter_chain = chart.build_filter_chain(chart_request);

    data.multi_json(requests, function(convos) { chart.plot_callback(filter_chain, convos); });
  }
}

chart.build_ledger_requests = function (chart_request) {
  if (chart_request.budget === false)
    return [chart_request];
  else {
    var no_budget_request = new ChartRequest(chart_request.query,
                                             chart_request.frequency,
                                             chart_request.start_date,
                                             chart_request.end_date,
                                             false,
                                             true, chart_request.accumulate);
    return [chart_request, no_budget_request];
  }
}

chart.build_filter_chain = function (chart_request) {
  return function(convos) {
    if (convos.every(function(c) { return c.response && c.response.length > 0; })) {
      var convos = convos.map(data.convert_response_date);
      if (chart_request.budget) {
        convos = data.calculate_budget(convos);
      }
      if (chart_request.accumulate) {
        convos = convos.map(data.accumulate);
      }
      return convos.map(data.convo_to_chart_data);
    }
  }
}

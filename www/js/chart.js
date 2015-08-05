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
setup_page();

function setup_page() {
  setup_typeahead();
  setup_datepicker();
  setup_graph();
  setup_more_options_collapse();
  window.onresize = function() { resize_reload_graph(); };
}

function setup_typeahead() {
  var accounts = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.whitespace,
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    prefetch: "/ledger_rest/accounts"
  });

  $(".typeahead").typeahead(null, {
    name: "accounts",
    source: accounts
  });

  $(".typeahead").on("typeahead:selected", function(e,i) {update_timeout();});

  $("#query").tooltip();
}

function default_start_date() {
  var before_today = new Date(Date.now());
  before_today.setFullYear(before_today.getFullYear() - 5);
  return before_today;
}

function setup_datepicker() {
  $(".datepicker").datepicker({})
  .on("changeDate", function(e) { update_timeout(); });
  $("#start_date.datepicker").datepicker("setDate", default_start_date());
}

function get_window_properties() {
  var window_properties = {
    width: window.innerWidth,
    height: window.innerHeight
  }
  return window_properties;
}

function setup_graph() {
  var properties = get_window_properties();
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

function setup_more_options_collapse() {
  document.getElementById("collapse_more_options_link").onclick = function() {
    if (this.text === "More options \u25C0")
      this.text = "More options \u25BC";
    else
      this.text = "More options \u25C0";
  };
  $("#collapse_more_options").on("hidden.bs.collapse", function() {
    resize_reload_graph();
  });
  $("#collapse_more_options").on("shown.bs.collapse", function() {
    resize_reload_graph();
  });
}

function resize_reload_graph() {
  setup_graph();
  update_timeout();
}

function plot_callback(filter_chain, convos) {
  var data = filter_chain(convos);
  cache.set_data(data);
  plot_register();
}

function get_graph_dimensions() {
  var svg = d3.select("#the_graph");
  var height = svg.attr("height");
  var width = svg.attr("width");
  return { height: height, width: width };
}

function plot_register() {
  var svg = d3.select("#the_graph");
  var dims = get_graph_dimensions();
  if (cache.get_data() !== undefined)
    plot_data(svg, cache.get_data(),
          build_plot_config(dims.height, dims.width, 500));
}

function parse_date_or_undefined(date_str) {
  var date = date_str.length > 0
    ? new Date(date_str)
    : undefined;
  return date;
}

function auto_frequency(start_date, end_date) {
  if (start_date === undefined)
    start_date = default_start_date();
  if (end_date === undefined)
    end_date = new Date(Date.now());

  // (millis / sec) (sec / min) (min / hour) (hour / day)
  var milliseconds_in_day = 1000*60*60*24;
  var days_in_range = (end_date.valueOf() - start_date.valueOf())
                      /milliseconds_in_day;

  // one point every 75 pixels
  // (days / point) = (days) / (width px) * (75 px / point)
  var dims = get_graph_dimensions();
  var day_frequency = Math.ceil(days_in_range / dims.width * 75);
  if (day_frequency < 1 || day_frequency > 1000)
    var frequency = "every 30 days";
  else
    var frequency = "every " + day_frequency + " days";

  return frequency;
}

function update_timeout() {
  var timeout_millis = 250;
  var timeout_id = cache.get_timeout();
  if (timeout_id !== undefined)
    window.clearTimeout(timeout_id);
  cache.set_timeout(window.setTimeout(update, timeout_millis));
}

function update() {
  var query = document.getElementById("query").value;
  var frequency = document.getElementById("frequency").value;
  var start_date = parse_date_or_undefined(document.getElementById("start_date").value);
  var end_date = parse_date_or_undefined(document.getElementById("end_date").value);
  var budget = document.getElementById("budget").checked;
  var accumulate = document.getElementById("accumulate").checked;

  if (query !== "") {
    if (frequency === "auto")
      frequency = auto_frequency(start_date, end_date);

    var chart_request = new ChartRequest(query, frequency, start_date, end_date,
                                         budget, accumulate);
    var requests = build_ledger_requests(chart_request);
    var filter_chain = build_filter_chain(chart_request);

    multi_json(requests, function(convos) { plot_callback(filter_chain, convos); });
  }
}

function build_ledger_requests(chart_request) {
  if (chart_request.budget === false)
    return [chart_request];
  else {
    var no_budget_request = new ChartRequest(chart_request.query,
                                             chart_request.frequency,
                                             chart_request.start_date,
                                             chart_request.end_date,
                                             false, chart_request.accumulate);
    return [chart_request, no_budget_request];
  }
}

function build_filter_chain(chart_request) {
  return function(convos) {
    var convos = convos.map(convert_response_date);
    if (chart_request.budget)
      convos = calculate_budget(convos);
    if (chart_request.accumulate)
      convos = convos.map(accumulate);
    return convos.map(convo_to_chart_data);
  }
}

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

function plot_data(svg, data, config) {
  for (var i = 0; i < data.length; i++) {
    if (data[i].d.length < 2)
      return;
  }

  var x_extent = combined_extent(data.map(function(d) { return [d.d, d.get_x]; }));
  var ys = data.map(function(d) { return [d.d, d.get_y]; });
  var y_extent = expand_extent(0.1, combined_extent(ys));

  var computed_width = compute_width_parameters(config, y_extent);

  var x = d3.time.scale().domain(x_extent).range([0, computed_width.graph_width]);
  var xaxis = d3.svg.axis()
  .scale(x)
  .orient("bottom");

  var x_tick_label_props
      = calc_x_tick_label_properties(svg, xaxis, config.x_tick_label_font_size);

  if (x_tick_label_props.x_tick_labels_overlapping)
    var x_tick_label_rotate = -45;
  else
    var x_tick_label_rotate = 0;

  var computed_height
      = compute_height_parameters(config, x_tick_label_props.max_x_tick_label_length,
                                  x_tick_label_rotate);
  var computed = $.extend({}, computed_width, computed_height);

  var y = d3.scale.linear().domain(y_extent).range([computed.graph_height, 0]);

  var yaxis = d3.svg.axis()
  .scale(y)
  .orient("left")

  var rect = append_if_missing(svg, "rect", "border_rect");
  rect
  .transition()
  .duration(config.transition_duration)
  .attr("width", config.svg_width)
  .attr("height", config.svg_height)
  .attr("class", "border_rect");

  svg_offset = append_if_missing(svg, "g", "svgoffset");

  svg_offset
  .transition()
  .duration(config.transition_duration)
  .attr("transform", translate_str(computed.svg_offset_x, computed.svg_offset_y));

  plot_axis_labels(svg_offset, config, computed, xaxis, yaxis, x_tick_label_rotate);

  plot_lines(svg_offset, config, data, x, y);

  if (data.length === 2 && is_mergeable(data[0], data[1])
      && (data[0].is_budget || data[1].is_budget)) {
        var diff_g = append_if_missing(svg_offset, "g", "diff_g");
        plot_budget_diff(diff_g, data, config, computed, x, y);
  } else
    d3.select("#diff_g").remove();

  // keep the legend on top by plotting last
  plot_legend(svg_offset, config, data, computed);
}

function calc_x_tick_label_properties(svg, xaxis, x_tick_label_font_size) {
  var temp_g = svg.append("g").attr("id", "temp_g");
  xaxis(temp_g);

  var label_bounds = [];
  var max_x_tick_label_length = 0;

  temp_g.selectAll(".tick")
  .each(function(d,i) {
    max_x_tick_label_length = Math.max(max_x_tick_label_length,
                                       d3.select(this).select("text").text().length);

    var translate = this.attributes["transform"].value;
    var center = parseFloat(translate.substring(translate.indexOf("(")+1,
                                                translate.indexOf(",")));
    var length = d3.select(this).select("text").text().length
                  * get_approx_font_px_width(x_tick_label_font_size);
    label_bounds.push([center - length/2, center + length/2]);
  });
  temp_g.remove();

  var x_tick_labels_overlapping = false;
  for (var i = 1; i < label_bounds.length; i++) {
    if (label_bounds[i-1][1] >= label_bounds[i][0])
      x_tick_labels_overlapping = true;
  }

  return {
    max_x_tick_label_length: max_x_tick_label_length,
    x_tick_labels_overlapping: x_tick_labels_overlapping
  }
}

function plot_axis_labels(svg_offset, config, computed, xaxis, yaxis, x_tick_label_rotate) {
  yaxis_g = append_if_missing(svg_offset, "g", "yaxis");

  yaxis_g
  .transition()
  .duration(config.transition_duration)
  .attr("class", "yaxis")
  .call(yaxis)
  .attr("font-size", font_pt_str(config.y_tick_label_font_size));

  yaxis_g.selectAll("text").attr("class", "tick_text");

  d3.selectAll("#yaxis .minor_gridline").remove();
  yaxis_g.selectAll(".tick")
  .each(function(d,i) {
    if (this.attributes["transform"].value !== translate_str(0, computed.graph_height)) {
      d3.select(this).append("line")
      .attr("class", "minor_gridline")
      .attr("x2", computed.graph_width);
    }
  });

  yaxis_label = append_if_missing(yaxis_g, "text", "yaxis_label");

  yaxis_label
  .transition()
  .duration(config.transition_duration)
  .attr("x", -computed.y_label_x)
  .attr("y", -computed.y_label_y)
  .attr("transform", "rotate(-90)")
  .text(config.y_label_text)
  .attr("font-size", font_pt_str(config.y_label_font_size))
  .attr("class", "label_text");

  xaxis_g = append_if_missing(svg_offset, "g", "xaxis");

  xaxis_g
  .transition()
  .duration(config.transition_duration)
  .attr("transform", translate_str(0, computed.graph_height))
  .attr("class", "xaxis")
  .call(xaxis)
  .attr("font-size", font_pt_str(config.x_tick_label_font_size));

  xaxis_g.selectAll("text")
  .attr("class", "tick_text");

  d3.selectAll("#xaxis .minor_gridline").remove();
  xaxis_g.selectAll(".tick")
  .each(function(d,i) {
    if (this.attributes["transform"].value !== translate_str(0, 0)) {
      d3.select(this).append("line")
      .attr("class", "minor_gridline")
      .attr("y2", -computed.graph_height);
    }
    d3.select(this).select("text")
    .attr("transform", "rotate(" + x_tick_label_rotate + ", 0, "
          + get_approx_font_px_height(config.x_tick_label_font_size) + ")")
  });

  xaxis_label = append_if_missing(xaxis_g, "text", "xaxis_label");

  xaxis_label
  .transition()
  .duration(config.transition_duration)
  .attr("x", computed.x_label_x)
  .attr("y", computed.x_label_y)
  .text(config.x_label_text)
  .attr("font-size", font_pt_str(config.x_label_font_size))
  .attr("class", "label_text");
}

function plot_lines(svg_offset, config, data, x, y) {
  remove_extras("line", data.length);
  for (var i = 0; i < data.length; i++) {
    var datum = data[i];
    var line = d3.svg.area()
    .x(function(d) { return x(datum.get_x(d)); })
    .y(function(d) { return y(datum.get_y(d)); })
    .interpolate("linear");

    var paths = append_if_missing(svg_offset, "path", "line" + i);
    paths.datum(datum.d);

    paths
    .transition()
    .duration(config.transition_duration)
    .attr("class", ["line", datum.style].join(" "))
    .attr("d", line);
  }
}

function plot_budget_diff(diff_g, data, config, computed, x, y) {
  if (data[0].is_budget) {
    var budget = data[0];
    var register = data[1];
  } else {
    var register = data[0];
    var budget = data[1];
  }
  var merged_data = [];
  for (var i = 0; i <budget.d.length; i++) {
    merged_data.push({date: budget.d[i].date,
                     budget: budget.d[i].amount,
                     register: register.d[i].amount
                     }
                    );
  }

  var area = d3.svg.area()
  .interpolate("linear")
  .x(function(d) { return x(d.date); })
  .y1(function(d) { return y(d.budget); });

  diff_g.datum(merged_data);

  var clip_below = append_if_missing(diff_g, "clipPath", "clip_below");

  append_if_missing(clip_below, "path", "clip_below_path")
  .transition()
  .duration(config.transition_duration)
  .attr("d", area.y0(computed.graph_height));

  var clip_above = append_if_missing(diff_g, "clipPath", "clip_above");

  append_if_missing(clip_above, "path", "clip_above_path")
  .transition()
  .duration(config.transition_duration)
  .attr("d", area.y0(0));

  var diff_path_above = append_if_missing(diff_g, "path", "diff_path_above");
  diff_path_above
  .transition()
  .duration(config.transition_duration)
  .attr("clip-path", "url(#clip_above)")
  .attr("d", area.y0(function(d) { return y(d.register); }));

  var diff_path_below = append_if_missing(diff_g, "path", "diff_path_below");
  diff_path_below
  .transition()
  .duration(config.transition_duration)
  .attr("clip-path", "url(#clip_below)")
  .attr("d", area);
}

function plot_legend(svg_offset, config, data, computed) {
  d3.select("#legend").remove();
  var legend_g = svg_offset.append("g").attr("id", "legend");

  legend_g
  .transition()
  .duration(config.transition_duration)
  .attr("transform", translate_str(config.legend_x, config.legend_y))

  var legend_rect = append_if_missing(legend_g, "rect", "legend_rect");
  legend_rect
  .attr("class", "legend_rect");

  remove_extras("label_line", data.length);
  remove_extras("label_text", data.length);

  var legend_text_y = config.legend_top_pad_px;
  var legend_width = 0;
  for (var i = 0; i < data.length; i++) {
    var datum = data[i];
    legend_text_y = legend_text_y + get_approx_font_px_height(config.legend_font_size);
    if (i !== 0) {
      legend_text_y = legend_text_y
            + config.legend_inner_height_pad_px;
    }

    var label_line = append_if_missing(legend_g, "rect", "label_line" + i);
    label_line
    .attr("class", "label_line")
    .attr("y", legend_text_y - get_approx_font_px_height(config.legend_font_size)/2
                + config.legend_dash_height)
    .attr("x", config.legend_left_pad_px)
    .attr("width", config.legend_dash_width)
    .attr("height", config.legend_dash_height)
    .attr("fill", datum.color);

    var label_text = append_if_missing(legend_g, "text", "label_text" + i);
    label_text
    .attr("class", "label_text")
    .attr("font-size", config.legend_font_size)
    .attr("y", legend_text_y)
    .attr("x", computed.legend_text_x)
    .attr("fill", "black")
    .text(datum.name);

    legend_width = Math.max(legend_width,
                              datum.name.length
                                * get_approx_font_px_width(config.legend_font_size));
  }

  var legend_height = legend_text_y + config.legend_bottom_pad_px;
  legend_rect.attr("height", legend_height);
  legend_width = legend_width + computed.legend_text_x + config.legend_right_pad_px;
  legend_rect.attr("width", legend_width);
}

function is_mergeable(x, y) {
  if (x.d.length !== y.d.length)
    return false;
  for (var i = 0; i < x.d.length; i++) {
    if (x.get_x(x.d[i]).valueOf() !== y.get_x(y.d[i]).valueOf())
      return false;
  }

  return true;
}

function build_plot_config(svg_height, svg_width, transition_duration) {
  var graph_config = {
    svg_height: svg_height,
    svg_width: svg_width,
    top_pad_px: 5,
    left_pad_px: 3,
    right_pad_px: 5,
    bottom_pad_px: 10,
    y_tick_label_font_size: 12,
    y_label_font_size: 16,
    y_label_pad_px: 8,
    y_label_text: "Amount ($)",
    x_tick_label_font_size: 12,
    max_x_tick_label_num_chars: 5,
    x_label_font_size: 16,
    x_label_pad_px: 5,
    x_label_text: "Date",
    legend_x: 5,
    legend_y: 5,
    legend_font_size: 12,
    legend_top_pad_px: 0,
    legend_left_pad_px: 5,
    legend_inner_width_pad_px: 3,
    legend_inner_height_pad_px: 3,
    legend_right_pad_px: 2,
    legend_bottom_pad_px: 5,
    legend_dash_height: 2,
    legend_dash_width: 10,
    transition_duration: transition_duration
  };
  return graph_config;
}

function count_digits(x) {
  return x > 0 ? 1 + Math.ceil(Math.log10(x))
    : 1 + Math.ceil(Math.log10(-x));
}

function append_if_missing(svg, element, id) {
  var css_id = "#" + id;
  if (svg.select(css_id).size() == 0)
    return svg.append(element).attr("id", id);
  else
    return svg.select(css_id);
}

function get_approx_font_px(font_pt) {
  if (font_pt == 22)
    return {w: 18, h: 30};
  else if (font_pt == 16)
    return {w: 13, h: 25};
  else if (font_pt == 14)
    return {w: 12, h: 21};
  else if (font_pt == 12)
    return {w: 8.7, h: 14};
  else
    return undefined;
}

function get_approx_font_px_fn(font_pt, fn) {
  var approx_font_px = get_approx_font_px(font_pt);
  if (approx_font_px == undefined)
    return undefined;
  else
    return fn(approx_font_px);
}

function get_approx_font_px_width(font_pt) {
  var width = function(f) { return f.w; };
  return get_approx_font_px_fn(font_pt, width);
}

function get_approx_font_px_height(font_pt) {
  var height = function(f) { return f.h; };
  return get_approx_font_px_fn(font_pt, height);
}

function compute_width_parameters(config, y_extent) {
  var max_y_val = Math.max(y_extent[0], y_extent[1], -y_extent[0], -y_extent[1]);
  var max_y_digits = count_digits(max_y_val);
  var y_tick_label_width =
    (Math.ceil(max_y_digits/3) + max_y_digits)
    * get_approx_font_px_width(config.y_tick_label_font_size);

  var x_tick_label_beyond_graph = config.max_x_tick_label_num_chars
    * get_approx_font_px_width(config.x_tick_label_font_size) / 2;
  var y_label_width = get_approx_font_px_height(config.y_label_font_size);

  var graph_width = config.svg_width - config.right_pad_px
                      - x_tick_label_beyond_graph
                      - y_tick_label_width
                      - config.y_label_pad_px - y_label_width
                      - config.left_pad_px;

  var x_label_width = config.x_label_text.length
    * get_approx_font_px_width(config.x_label_font_size);

  var svg_offset_x = config.left_pad_px + config.y_label_pad_px
                      + y_label_width + y_tick_label_width;

  var x_label_x = graph_width/2 - x_label_width/2;
  var y_label_y = y_tick_label_width + config.y_label_pad_px;

  var computed_parameters = {
    svg_offset_x: svg_offset_x,
    graph_width: graph_width,
    x_label_x: x_label_x,
    y_label_y: y_label_y
  };
  return computed_parameters;
}

function compute_height_parameters(config, max_x_tick_label_chars, x_tick_label_rotate) {
  var y_tick_label_above_graph = get_approx_font_px_height(config.y_tick_label_font_size)/2;

  var y_label_height = config.y_label_text.length
    * get_approx_font_px_width(config.y_label_font_size);

  var rotate_radians = -x_tick_label_rotate / 180 * Math.PI;
  var x_tick_label_height =
    Math.abs(get_approx_font_px_height(config.x_tick_label_font_size)*Math.cos(rotate_radians)
    + max_x_tick_label_chars*get_approx_font_px_width(config.x_tick_label_font_size)
      *Math.sin(rotate_radians));

  var x_label_height = get_approx_font_px_height(config.x_label_font_size);
  var svg_offset_y = y_tick_label_above_graph + config.top_pad_px;

  var graph_height = config.svg_height - config.top_pad_px
                       - y_tick_label_above_graph
                       - x_tick_label_height
                       - config.x_label_pad_px - x_label_height
                       - config.bottom_pad_px;

  var x_label_y = x_tick_label_height + x_label_height + config.x_label_pad_px;
  var y_label_x = graph_height/2 + y_label_height/2;

  var legend_text_x = config.legend_left_pad_px + config.legend_dash_width
                      + config.legend_inner_width_pad_px;

  var computed_parameters = {
    svg_offset_y: svg_offset_y,
    graph_height: graph_height,
    x_label_y: x_label_y,
    y_label_x: y_label_x,
    legend_text_x: legend_text_x
  };
  return computed_parameters;
}

function translate_str(x, y) {
  var translate_str = "translate(" + x + "," + y + ")";
  return translate_str;
}

function font_pt_str(font_pt) {
  var font_pt_str = font_pt + "pt";
  return font_pt_str;
}

function combined_extent(data) {
  var max = undefined;
  var min = undefined;
  data.forEach(function(datum) {
    var d = datum[0];
    var accessor = datum[1];
    max = max === undefined
      ? d3.max(d, accessor)
      : Math.max(max, d3.max(d, accessor));
    min = min === undefined
      ? d3.min(d, accessor)
      : Math.min(min, d3.min(d, accessor));
  });
  return [min, max];
}

function expand_extent(alpha, extent) {
  var range = extent[1] - extent[0];
  return [extent[0]-alpha/2*range, extent[1]+alpha/2*range];
}

function remove_extras(id, data_length) {
  var elems = d3.selectAll("." + id);
  for (var i = data_length; i < elems.size(); i++) {
    d3.select("#"+ id + i).remove();
  }
}

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

export const plot = {}
plot.plot_data = function (svg, data, config) {
  for (let i = 0; i < data.length; i++) {
    if (data[i].d.length < 2) {
      return
    }
  }

  const x_extent = plot.combined_extent(data.map(function (d) { return [d.d, d.get_x] }))
  const ys = data.map(function (d) { return [d.d, d.get_y] })
  const y_extent = plot.expand_extent(0.1, plot.combined_extent(ys))

  const computed_width = plot.compute_width_parameters(config, y_extent)

  const x = d3.time.scale().domain(x_extent).range([0, computed_width.graph_width])
  const xaxis = d3.svg.axis()
    .scale(x)
    .orient('bottom')

  const x_tick_label_props =
      plot.calc_x_tick_label_properties(svg, xaxis, config.x_tick_label_font_size)

  let x_tick_label_rotate
  if (x_tick_label_props.x_tick_labels_overlapping) {
    x_tick_label_rotate = -45
  } else {
    x_tick_label_rotate = 0
  }

  const computed_height =
      plot.compute_height_parameters(config, x_tick_label_props.max_x_tick_label_length,
        x_tick_label_rotate)
  const computed = $.extend({}, computed_width, computed_height)

  const y = d3.scale.linear().domain(y_extent).range([computed.graph_height, 0])

  const yaxis = d3.svg.axis()
    .scale(y)
    .orient('left')

  const rect = plot.append_if_missing(svg, 'rect', 'border_rect')
  rect
    .transition()
    .duration(config.transition_duration)
    .attr('width', config.svg_width)
    .attr('height', config.svg_height)
    .attr('class', 'border_rect')

  const svg_offset = plot.append_if_missing(svg, 'g', 'svgoffset')

  svg_offset
    .transition()
    .duration(config.transition_duration)
    .attr('transform', plot.translate_str(computed.svg_offset_x, computed.svg_offset_y))

  plot.plot_axis_labels(svg_offset, config, computed, xaxis, yaxis, x_tick_label_rotate)

  plot.plot_lines(svg_offset, config, data, x, y)

  if (data.length === 2 && plot.is_mergeable(data[0], data[1]) &&
    (data[0].is_budget || data[1].is_budget)) {
    const diff_g = plot.append_if_missing(svg_offset, 'g', 'diff_g')
    plot.plot_budget_diff(diff_g, data, config, computed, x, y)
  } else {
    d3.select('#diff_g').remove()
  }

  // keep the legend on top by plotting last
  plot.plot_legend(svg_offset, config, data, computed)
}

plot.calc_x_tick_label_properties = function (svg, xaxis, x_tick_label_font_size) {
  const temp_g = svg.append('g').attr('id', 'temp_g')
  xaxis(temp_g)

  const label_bounds = []
  let max_x_tick_label_length = 0

  temp_g.selectAll('.tick')
    .each(function (d, i) {
      max_x_tick_label_length = Math.max(max_x_tick_label_length,
        d3.select(this).select('text').text().length)

      const translate = this.attributes.transform.value
      const center = parseFloat(translate.substring(translate.indexOf('(') + 1,
        translate.indexOf(',')))
      const length = d3.select(this).select('text').text().length *
      plot.get_approx_font_px_width(x_tick_label_font_size)
      label_bounds.push([center - length / 2, center + length / 2])
    })
  temp_g.remove()

  let x_tick_labels_overlapping = false
  for (let i = 1; i < label_bounds.length; i++) {
    if (label_bounds[i - 1][1] >= label_bounds[i][0]) {
      x_tick_labels_overlapping = true
    }
  }

  return {
    max_x_tick_label_length,
    x_tick_labels_overlapping
  }
}

plot.plot_axis_labels = function (svg_offset, config, computed, xaxis, yaxis, x_tick_label_rotate) {
  const yaxis_g = plot.append_if_missing(svg_offset, 'g', 'yaxis')

  yaxis_g
    .transition()
    .duration(config.transition_duration)
    .attr('class', 'yaxis')
    .call(yaxis)
    .attr('font-size', plot.font_pt_str(config.y_tick_label_font_size))

  yaxis_g.selectAll('text').attr('class', 'tick_text')

  d3.selectAll('#yaxis .minor_gridline').remove()
  yaxis_g.selectAll('.tick')
    .each(function (d, i) {
      if (this.attributes.transform.value !== plot.translate_str(0, computed.graph_height)) {
        d3.select(this).append('line')
          .attr('class', 'minor_gridline')
          .attr('x2', computed.graph_width)
      }
    })

  const yaxis_label = plot.append_if_missing(yaxis_g, 'text', 'yaxis_label')

  yaxis_label
    .transition()
    .duration(config.transition_duration)
    .attr('x', -computed.y_label_x)
    .attr('y', -computed.y_label_y)
    .attr('transform', 'rotate(-90)')
    .text(config.y_label_text)
    .attr('font-size', plot.font_pt_str(config.y_label_font_size))
    .attr('class', 'label_text')

  const xaxis_g = plot.append_if_missing(svg_offset, 'g', 'xaxis')

  xaxis_g
    .transition()
    .duration(config.transition_duration)
    .attr('transform', plot.translate_str(0, computed.graph_height))
    .attr('class', 'xaxis')
    .call(xaxis)
    .attr('font-size', plot.font_pt_str(config.x_tick_label_font_size))

  xaxis_g.selectAll('text')
    .attr('class', 'tick_text')

  d3.selectAll('#xaxis .minor_gridline').remove()
  xaxis_g.selectAll('.tick')
    .each(function (d, i) {
      if (this.attributes.transform.value !== plot.translate_str(0, 0)) {
        d3.select(this).append('line')
          .attr('class', 'minor_gridline')
          .attr('y2', -computed.graph_height)
      }
      d3.select(this).select('text')
        .attr('transform', 'rotate(' + x_tick_label_rotate + ', 0, ' +
      plot.get_approx_font_px_height(config.x_tick_label_font_size) + ')')
    })

  const xaxis_label = plot.append_if_missing(xaxis_g, 'text', 'xaxis_label')

  xaxis_label
    .transition()
    .duration(config.transition_duration)
    .attr('x', computed.x_label_x)
    .attr('y', computed.x_label_y)
    .text(config.x_label_text)
    .attr('font-size', plot.font_pt_str(config.x_label_font_size))
    .attr('class', 'label_text')
}

plot.plot_lines = function (svg_offset, config, data, x, y) {
  plot.remove_extras('line', data.length)
  for (let i = 0; i < data.length; i++) {
    const datum = data[i]
    const line = d3.svg.area()
      .x(function (d) { return x(datum.get_x(d)) })
      .y(function (d) { return y(datum.get_y(d)) })
      .interpolate('linear')

    const paths = plot.append_if_missing(svg_offset, 'path', 'line' + i)
    paths.datum(datum.d)

    paths
      .transition()
      .duration(config.transition_duration)
      .attr('class', ['line', datum.style].join(' '))
      .attr('d', line)
  }
}

plot.plot_budget_diff = function (diff_g, data, config, computed, x, y) {
  let budget
  let register
  if (data[0].is_budget) {
    budget = data[0]
    register = data[1]
  } else {
    register = data[0]
    budget = data[1]
  }
  const merged_data = []
  for (let i = 0; i < budget.d.length; i++) {
    merged_data.push({
      date: budget.d[i].date,
      budget: budget.d[i].amount,
      register: register.d[i].amount
    })
  }

  const area = d3.svg.area()
    .interpolate('linear')
    .x(function (d) { return x(d.date) })
    .y1(function (d) { return y(d.budget) })

  diff_g.datum(merged_data)

  const clip_below = plot.append_if_missing(diff_g, 'clipPath', 'clip_below')

  plot.append_if_missing(clip_below, 'path', 'clip_below_path')
    .transition()
    .duration(config.transition_duration)
    .attr('d', area.y0(computed.graph_height))

  const clip_above = plot.append_if_missing(diff_g, 'clipPath', 'clip_above')

  plot.append_if_missing(clip_above, 'path', 'clip_above_path')
    .transition()
    .duration(config.transition_duration)
    .attr('d', area.y0(0))

  const diff_path_above = plot.append_if_missing(diff_g, 'path', 'diff_path_above')
  diff_path_above
    .transition()
    .duration(config.transition_duration)
    .attr('clip-path', 'url(#clip_above)')
    .attr('d', area.y0(function (d) { return y(d.register) }))

  const diff_path_below = plot.append_if_missing(diff_g, 'path', 'diff_path_below')
  diff_path_below
    .transition()
    .duration(config.transition_duration)
    .attr('clip-path', 'url(#clip_below)')
    .attr('d', area)
}

plot.plot_legend = function (svg_offset, config, data, computed) {
  d3.select('#legend').remove()
  const legend_g = svg_offset.append('g').attr('id', 'legend')

  legend_g
    .transition()
    .duration(config.transition_duration)
    .attr('transform', plot.translate_str(config.legend_x, config.legend_y))

  const legend_rect = plot.append_if_missing(legend_g, 'rect', 'legend_rect')
  legend_rect
    .attr('class', 'legend_rect')

  plot.remove_extras('label_line', data.length)
  plot.remove_extras('label_text', data.length)

  let legend_text_y = config.legend_top_pad_px
  let legend_width = 0
  for (let i = 0; i < data.length; i++) {
    const datum = data[i]
    legend_text_y = legend_text_y + plot.get_approx_font_px_height(config.legend_font_size)
    if (i !== 0) {
      legend_text_y = legend_text_y +
            config.legend_inner_height_pad_px
    }

    const label_line = plot.append_if_missing(legend_g, 'rect', 'label_line' + i)
    label_line
      .attr('class', ['label_line', datum.style].join(' '))
      .attr('y', legend_text_y - plot.get_approx_font_px_height(config.legend_font_size) / 2 +
                config.legend_dash_height)
      .attr('x', config.legend_left_pad_px)
      .attr('width', config.legend_dash_width)
      .attr('height', config.legend_dash_height)

    const label_text = plot.append_if_missing(legend_g, 'text', 'label_text' + i)
    label_text
      .attr('class', 'label_text')
      .attr('font-size', config.legend_font_size)
      .attr('y', legend_text_y)
      .attr('x', computed.legend_text_x)
      .attr('fill', 'black')
      .text(datum.name)

    legend_width = Math.max(legend_width,
      datum.name.length *
                                plot.get_approx_font_px_width(config.legend_font_size))
  }

  const legend_height = legend_text_y + config.legend_bottom_pad_px
  legend_rect.attr('height', legend_height)
  legend_width = legend_width + computed.legend_text_x + config.legend_right_pad_px
  legend_rect.attr('width', legend_width)
}

plot.is_mergeable = function (x, y) {
  if (x.d.length !== y.d.length) {
    return false
  }
  for (let i = 0; i < x.d.length; i++) {
    if (x.get_x(x.d[i]).valueOf() !== y.get_x(y.d[i]).valueOf()) {
      return false
    }
  }

  return true
}

plot.build_plot_config = function (svg_height, svg_width, transition_duration) {
  const graph_config = {
    svg_height,
    svg_width,
    top_pad_px: 5,
    left_pad_px: 3,
    right_pad_px: 5,
    bottom_pad_px: 10,
    y_tick_label_font_size: 12,
    y_label_font_size: 16,
    y_label_pad_px: 8,
    y_label_text: 'Amount ($)',
    x_tick_label_font_size: 12,
    max_x_tick_label_num_chars: 5,
    x_label_font_size: 16,
    x_label_pad_px: 5,
    x_label_text: 'Date',
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
    transition_duration
  }
  return graph_config
}

plot.count_digits = function (x) {
  if (x >= -1 && x < 1) {
    console.warn('Counting digits on number less than 1.')
    return 1 // This isn't right, but shouldn't be encountered.
  } else if (x > 1) {
    return 1 + Math.ceil(Math.log10(x))
  } else {
    return 1 + Math.ceil(Math.log10(-x))
  }
}

plot.append_if_missing = function (svg, element, id) {
  const css_id = '#' + id
  if (svg.select(css_id).size() === 0) {
    return svg.append(element).attr('id', id)
  } else {
    return svg.select(css_id)
  }
}

plot.get_approx_font_px = function (font_pt) {
  if (font_pt === 22) {
    return { w: 18, h: 30 }
  } else if (font_pt === 16) {
    return { w: 13, h: 25 }
  } else if (font_pt === 14) {
    return { w: 12, h: 21 }
  } else if (font_pt === 12) {
    return { w: 8.7, h: 14 }
  } else {
    return undefined
  }
}

plot.get_approx_font_px_fn = function (font_pt, fn) {
  const approx_font_px = plot.get_approx_font_px(font_pt)
  if (approx_font_px === undefined) {
    return undefined
  } else {
    return fn(approx_font_px)
  }
}

plot.get_approx_font_px_width = function (font_pt) {
  const width = function (f) { return f.w }
  return plot.get_approx_font_px_fn(font_pt, width)
}

plot.get_approx_font_px_height = function (font_pt) {
  const height = function (f) { return f.h }
  return plot.get_approx_font_px_fn(font_pt, height)
}

plot.compute_width_parameters = function (config, y_extent) {
  const max_y_val = Math.max(y_extent[0], y_extent[1], -y_extent[0], -y_extent[1])
  const max_y_digits = plot.count_digits(max_y_val)
  const y_tick_label_width =
    (Math.ceil(max_y_digits / 3) + max_y_digits) *
    plot.get_approx_font_px_width(config.y_tick_label_font_size)

  const x_tick_label_beyond_graph = config.max_x_tick_label_num_chars *
    plot.get_approx_font_px_width(config.x_tick_label_font_size) / 2
  const y_label_width = plot.get_approx_font_px_height(config.y_label_font_size)

  const graph_width = config.svg_width - config.right_pad_px -
                      x_tick_label_beyond_graph -
                      y_tick_label_width -
                      config.y_label_pad_px - y_label_width -
                      config.left_pad_px

  const x_label_width = config.x_label_text.length *
    plot.get_approx_font_px_width(config.x_label_font_size)

  const svg_offset_x = config.left_pad_px + config.y_label_pad_px +
                      y_label_width + y_tick_label_width

  const x_label_x = graph_width / 2 - x_label_width / 2
  const y_label_y = y_tick_label_width + config.y_label_pad_px

  const computed_parameters = {
    svg_offset_x,
    graph_width,
    x_label_x,
    y_label_y
  }
  return computed_parameters
}

plot.compute_height_parameters = function (config, max_x_tick_label_chars, x_tick_label_rotate) {
  const y_tick_label_above_graph = plot.get_approx_font_px_height(config.y_tick_label_font_size) / 2

  const y_label_height = config.y_label_text.length *
    plot.get_approx_font_px_width(config.y_label_font_size)

  const rotate_radians = -x_tick_label_rotate / 180 * Math.PI
  const x_tick_label_height =
    Math.abs(plot.get_approx_font_px_height(config.x_tick_label_font_size) *
      Math.cos(rotate_radians) +
      max_x_tick_label_chars * plot.get_approx_font_px_width(config.x_tick_label_font_size) *
      Math.sin(rotate_radians))

  const x_label_height = plot.get_approx_font_px_height(config.x_label_font_size)
  const svg_offset_y = y_tick_label_above_graph + config.top_pad_px

  const graph_height = config.svg_height - config.top_pad_px -
                       y_tick_label_above_graph -
                       x_tick_label_height -
                       config.x_label_pad_px - x_label_height -
                       config.bottom_pad_px

  const x_label_y = x_tick_label_height + x_label_height + config.x_label_pad_px
  const y_label_x = graph_height / 2 + y_label_height / 2

  const legend_text_x = config.legend_left_pad_px + config.legend_dash_width +
                      config.legend_inner_width_pad_px

  const computed_parameters = {
    svg_offset_y,
    graph_height,
    x_label_y,
    y_label_x,
    legend_text_x
  }
  return computed_parameters
}

plot.translate_str = function (x, y) {
  const translate_str = 'translate(' + x + ',' + y + ')'
  return translate_str
}

plot.font_pt_str = function (font_pt) {
  const font_pt_str = font_pt + 'pt'
  return font_pt_str
}

plot.combined_extent = function (data) {
  let max
  let min
  data.forEach(function (datum) {
    const d = datum[0]
    const accessor = datum[1]
    max = max === undefined
      ? d3.max(d, accessor)
      : Math.max(max, d3.max(d, accessor))
    min = min === undefined
      ? d3.min(d, accessor)
      : Math.min(min, d3.min(d, accessor))
  })
  return [min, max]
}

plot.expand_extent = function (alpha, extent) {
  const range = extent[1] - extent[0]
  return [extent[0] - alpha / 2 * range, extent[1] + alpha / 2 * range]
}

plot.remove_extras = function (id, data_length) {
  const elems = d3.selectAll('.' + id)
  for (let i = data_length; i < elems.size(); i++) {
    d3.select('#' + id + i).remove()
  }
}

/*
 * Copyright (c) 2015-2017 Chad Voegele
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
// http://halistechnology.com/2015/05/28/use-javascript-to-export-your-data-as-csv/

import { LedgerRequest } from './LedgerRequest'
import { ObjectSet } from './ObjectSet'
import { Cache } from './cache'
import '../../css/table.css'

export function Table (start_date, end_date) {
  if (end_date) {
    this.end_date = end_date
  } else {
    this.end_date = new Date(Date.now())
    // ledger uses date before end date in period expressions
    this.end_date.setDate(this.end_date.getDate() + 1)
  }

  if (start_date) {
    this.start_date = start_date
  } else {
    const before_today = new Date(Date.now())
    before_today.setMonth(before_today.getMonth() - 2)
    before_today.setDate(1)
    this.start_date = before_today
  }

  this.cache = new Cache()
}

Table.prototype.load = function (document) {
  const _this = this

  const base_args = [
    '--empty',
    '--market',
    '--no-revalued'
  ]
  const budget_args = Array.from(base_args).concat('--add-budget')
  const actual_args = Array.from(base_args).concat('--add-budget', '--actual')

  const ledgerRequests = [
    new LedgerRequest({
      frequency: 'monthly',
      start_date: _this.start_date,
      end_date: _this.end_date,
      args: actual_args
    }),
    new LedgerRequest({
      frequency: 'monthly',
      start_date: _this.start_date,
      end_date: _this.end_date,
      args: budget_args
    }),
    new LedgerRequest({
      start_date: monthsBefore(_this.end_date, 12),
      end_date: _this.end_date,
      args: Array.from(actual_args).concat('--subtotal')
    }),
    new LedgerRequest({
      start_date: monthsBefore(_this.end_date, 12),
      end_date: _this.end_date,
      args: Array.from(budget_args).concat('--subtotal')
    }),
    new LedgerRequest({
      start_date: monthsBefore(_this.end_date, 60),
      end_date: _this.end_date,
      args: Array.from(actual_args).concat('--subtotal')
    }),
    new LedgerRequest({
      start_date: monthsBefore(_this.end_date, 60),
      end_date: _this.end_date,
      args: Array.from(budget_args).concat('--subtotal')
    })
  ]

  const postRequests = ledgerRequests.map(function (lr) {
    return lr.to_request_object()
  })

  fetch(LedgerRequest.prototype.base_url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(postRequests),
    credentials: 'same-origin'

  }).then(function (responses) {
    return responses.json()
  }).then(function (responsesJSON) {
    const requestResponsePairs = responsesJSON.map(function (r, i) {
      return {
        request: ledgerRequests[i],
        response: responsesJSON[i]
      }
    })
    return requestResponsePairs
  }).then(function removeInactiveAccounts (datas) {
    const accounts = datas
      .filter(function (data) {
        return !!data.request.frequency
      })
      .map(function (data) {
        return data.response.map(function (record) {
          return record.account_name
        })
      })
      .reduce(function (a, b) {
        return a.concat(b)
      })

    const accounts_set = new Set(accounts)
    datas = datas.map(function (data) {
      if (data.request.frequency) {
        return data
      }

      const filteredResponses = data.response
        .filter(function (record) {
          return accounts_set.has(record.account_name)
        })

      return {
        request: data.request,
        response: filteredResponses
      }
    })

    return datas
  }).then(_this.processData.bind(_this))

    .catch(function (error) {
      console.error(error)
    })
}

Table.prototype.processData = function (convos) {
  const data = convos.reduce(function (agg, convo) {
    if (convo.response && convo.request) {
      const rows = convo.response.map(function (row) {
        // Javascript date parsing funkiness requires forward slashes to set
        // the timezone correctly
        const dateSlashes = row.date.replace(/-/g, '/')
        return {
          amount: row.amount,
          date: new Date(dateSlashes),
          account_name: row.account_name,
          frequency: convo.request.frequency || 'total',
          budget: convo.request.args.every(function (e) { return e !== '--actual' })
        }
      })
      return agg.concat(rows)
    } else {
      return agg
    }
  }, [])

  this.cache.set_data(data, 'data')

  const tableParts = tableHTML.dataToPivottedTableParts({
    data,
    columnKeys: ['date', 'budget', 'frequency'],
    rowKeys: ['account_name']
  })

  const rowFormatter = function (r) {
    const year_before_today = new Date(this.end_date)
    year_before_today.setMonth(year_before_today.getMonth() - 12)
    const chartOptions = {
      query: r.account_name,
      start_date: year_before_today.toLocaleDateString(),
      end_date: this.end_date.toLocaleDateString(),
      frequency: 'monthly'
    }
    const linkOptions = Object.keys(chartOptions).map(function (k) {
      return k + '=' + encodeURIComponent(chartOptions[k])
    }).join('&')
    const linkHref = 'chart.html?' + linkOptions
    const linkValue = '<a href="' + linkHref + '">' + r.account_name + '</a>'
    return {
      value: linkValue
    }
  }

  const columnFormatter = function (c) {
    return {
      value: c.date.toLocaleDateString() + (c.budget ? '\nbudget' : '') + '\n' + c.frequency
    }
  }

  const dataFormatter = function (d) {
    const formattedData = {
      value: ''
    }

    if (d && d.amount) {
      formattedData.value = d.amount.toFixed(2)
    }

    if (d && d.amount && d.budget) {
      formattedData.attributes = {
        class: d.amount < 0 ? 'success' : 'danger'
      }
    }

    return formattedData
  }

  const table = tableHTML.tablePartsToTable({
    tableParts,
    formatterParts: {
      row: rowFormatter.bind(this),
      column: columnFormatter,
      data: dataFormatter
    }
  })

  const tableClasses = 'table table-striped table-hover table-bordered table-condensed'
  const HTML = tableHTML.tableToHTML(table, tableClasses)
  document.getElementById('thetable').innerHTML = HTML
}

Table.prototype.downloadCSV = function () {
  const data = this.cache.get_data('data') || []
  const filename = 'export.csv'

  const tableData = recordsCSV.dataToTable(data)
  const csvData = recordsCSV.tableToCSV(tableData)
  const csvString = 'data:text/csv;charset=utf-8,' + csvData

  const link = document.createElement('a')
  link.setAttribute('href', encodeURI(csvString))
  link.setAttribute('download', filename)
  link.click()
  link.remove()
}

const recordsCSV = {}

/**
 * Input:
 * data = [
 *   { key1: a, key2: b},
 *   { key1: c, key3: d}
 *   ]
 *
 * Output:
 *  [
 *   [ 'key1', 'key2', 'key3' ],
 *   [      a,      b,   null ],
 *   [      c,   null,      d ]
 *  ]
 */
recordsCSV.dataToTable = function (data) {
  const keys = new Set()
  data.forEach(function (obj) {
    Object.keys(obj).forEach(function (key) {
      keys.add(key)
    })
  })

  const headers = Array.from(keys.keys())
  const table = data.reduce(function (agg, rowObj) {
    const rowArray = headers.map(function (h) { return rowObj[h] || null })
    return agg.concat([rowArray])
  }, [headers])

  return table
}

/**
 * Input:
 *  [
 *   [ 'key1', 'key2', 'key3' ],
 *   [      a,      b,   null ],
 *   [      c,   null,      d ]
 *  ]
 *
 * Output:
 *  'key1,key2,key3\na,b,,\n...'
 */
recordsCSV.tableToCSV = function (table) {
  const csv = table.map(function (row) {
    return row.map(function (r) {
      return r === null ? '' : r.toString()
    }).join(',')
  }).join('\n')

  return csv
}

const tableHTML = {}

/**
 * Input:
 *  data = [
 *    { amount: 1, date: 2046-07-01, account_name: 'exp', budget: false }
 *    { amount: -5, date: 2046-07-01, account_name: 'exp', budget: true }
 *    { amount: -10, date: 2046-07-01, account_name: 'inc', budget: false }
 *    ]
 *  keys = [ 'date', 'budget' ]
 *
 * Output:
 *  [
 *    { date: 2046-07-01, budget: false },
 *    { date: 2046-07-01, budget: true }
 *  ]
 */
tableHTML.extractKeys = function (data, keys) {
  const keysSet = new ObjectSet()
  data.forEach(function (row) {
    const key = {}
    keys.forEach(function (k) {
      key[k] = row[k]
    })
    keysSet.add(key)
  })
  const keysArray = Array.from(keysSet.keys())
  return keysArray
}

/**
 * Compare a and b by property in order of keys.
 *
 * Input:
 *  keys - array of string
 *  a - object
 *  b - object
 */
tableHTML.sortByComparator = function (keys, a, b) {
  const keysCopy = keys.slice() // shallow copy
  const sortKey = keysCopy.shift()
  if (sortKey) {
    if (a[sortKey] < b[sortKey]) {
      return -1
    } else if (a[sortKey] > b[sortKey]) {
      return 1
    } else {
      return tableHTML.sortByComparator(keysCopy, a, b)
    }
  } else {
    return 0
  }
}

/**
 * Input:
 * {
 *   data: [
 *       { amount: 1, date: 2046-07-01, account_name: 'exp', budget: false }
 *       { amount: -5, date: 2046-07-01, account_name: 'exp', budget: true }
 *       { amount: 10, date: 2046-07-01, account_name: 'inc', budget: false }
 *       { amount: -50, date: 2046-07-01, account_name: 'inc', budget: true }
 *     ],
 *   columnKeys: [ 'budget', 'date' ],
 *   rowKeys: [ 'account_name' ]
 * }
 *
 * Output:
 *  {
 *    rows: [ { account_name: 'exp' }, { account_name: 'inc' } ]
 *    columns: [
 *               { date: 2046-07-01, budget: false }
 *               { date: 2046-07-01, budget: true }
 *             ]
 *    data: [
 *            [
 *              { account_name: 'exp', date: 2046-07-01, amount: 1, budget: false },
 *              { account_name: 'exp', date: 2046-07-01, amount: -5, budget: true }
 *            ],
 *            [
 *              { account_name: 'inc', date: 2046-07-01, amount: 10, budget: false },
 *              { account_name: 'inc', date: 2046-07-01, amount: -50, budget: true }
 *            ]
 *          ]
 *  }
 */
tableHTML.dataToPivottedTableParts = function (args) {
  const columnHeaders = tableHTML.extractKeys(args.data, args.columnKeys)
  columnHeaders.sort(function (a, b) {
    return tableHTML.sortByComparator(args.columnKeys, a, b)
  })
  const rowHeaders = tableHTML.extractKeys(args.data, args.rowKeys)
  rowHeaders.sort(function (a, b) {
    return tableHTML.sortByComparator(args.rowKeys, a, b)
  })

  const filterData = function (data, header) {
    const filteredData = data.filter(function (d) {
      return Object.keys(header).every(function (k) {
        return JSON.stringify(header[k]) === JSON.stringify(d[k])
      })
    })
    return filteredData
  }
  const tableData = rowHeaders.map(function (rowHeader) {
    const rowData = filterData(args.data, rowHeader)
    const row = columnHeaders.map(function (columnHeader) {
      const columnData = filterData(rowData, columnHeader)
      if (columnData.length > 1) {
        console.error('More than one entry found for row: ' + JSON.stringify(rowHeader) +
          ', column: ' + JSON.stringify(columnHeader) + '. Using first match.')
      }
      return columnData[0]
    })
    return row
  })
  return {
    rows: rowHeaders,
    columns: columnHeaders,
    data: tableData
  }
}

/**
 * Input:
 *   tableParts = {
 *     rows: [ { account_name: 'exp' }, { account_name: 'inc' } ]
 *     columns: [
 *                { date: 2046-07-01, budget: false }
 *                { date: 2046-07-01, budget: true }
 *              ]
 *     data: [
 *             [
 *               { account_name: 'exp', date: 2046-07-01, amount: 1, budget: false },
 *               { account_name: 'exp', date: 2046-07-01, amount: -5, budget: true }
 *             ],
 *             [
 *               { account_name: 'inc', date: 2046-07-01, amount: 10, budget: false },
 *               { account_name: 'inc', date: 2046-07-01, amount: -50, budget: true }
 *             ]
 *           ]
 *   }
 *  formatterParts = {
 *    row: function (row) -> { attributes, value },
 *    column: function (column) -> { attributes, value },
 *    data: function (data) -> { attributes, value }
 *  }
 *
 *  Output:
 *   v  = function(s) => { value: s }
 *  [
 *    [    v(''), v('2046-07-01'), v('2046-07-01\nbudget') ],
 *    [ v('exp'),          v('1'),                 v('-5') ]
 *    [ v('inc'),         v('10'),                v('-50') ]
 *  ]
 */
tableHTML.tablePartsToTable = function (args) {
  const headerRow = [''].concat(args.tableParts.columns.map(args.formatterParts.column))
  const dataRows = args.tableParts.rows.map(function (r, i) {
    const formatted = args.tableParts.data[i].map(args.formatterParts.data)
    return [args.formatterParts.row(r)].concat(formatted)
  })
  const table = [headerRow].concat(dataRows)
  return table
}

/**
 * Input:
 *   tag - 'td'
 *   value - '4'
 *   attributes - {
 *     class: 'special'
 *   }
 *
 * Output:
 *   '<td class="special">4</td>'
 *
 */
tableHTML.makeTag = function (tag, value, attributes) {
  let attributesString = ''
  if (attributes) {
    attributesString = Object.keys(attributes).map(function (k) {
      return ' ' + k + '="' + attributes[k] + '"'
    }).join('')
  }
  const valueString = value || ''
  const tagBlock = '<' + tag + attributesString + '>' + valueString + '</' + tag + '>'
  return tagBlock
}

/**
 * Input:
 *   v  = function(s) => { value: s }
 * [
 *   [  v(''), v('a'), v('b') ],
 *   [ v('c'), v('d'), v('e') ]
 * ]
 *
 * Output:
 * <table>
 *   <tr>
 *     <td></td>
 *     <td>a</td>
 *     <td>b</td>
 *   </tr>
 *   <tr>
 *     <td>c</td>
 *     <td>d</td>
 *     <td>e</td>
 *   </tr>
 * </table>
 */
tableHTML.tableToHTML = function (table, tableClasses) {
  const HTML =
    '<table class="' + tableClasses + '">\n' +
    table.map(function (row) {
      const rowHTML =
        '\t<tr>\n' +
        row.map(function (c) {
          return '\t\t' + tableHTML.makeTag('td', c.value, c.attributes) + '\n'
        }).join('') +
        '\t</tr>\n'
      return rowHTML
    }).join('') +
    '\n</table>'
  return HTML
}

const monthsBefore = function (today, months) {
  const before_today = new Date(today)
  before_today.setMonth(before_today.getMonth() - months)
  return before_today
}

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
// http://halistechnology.com/2015/05/28/use-javascript-to-export-your-data-as-csv/

function Table(start_date, end_date) {
  if (end_date) {
    this.end_date = end_date;
  } else {
    this.end_date = new Date(Date.now());
    // ledger uses date before end date in period expressions
    this.end_date.setDate(this.end_date.getDate() + 1);
  }

  if (start_date) {
    this.start_date = start_date;
  } else {
    var before_today = new Date(Date.now());
    before_today.setMonth(before_today.getMonth() - 6)
    before_today.setDate(1);
    this.start_date = before_today;
  }

  this.cache = new Cache();
};

Table.prototype.load = function () {
  var _this = this;
  fetch('/ledger_rest/budget_accounts')
    .then(function (response) {
      return response.json();

    }).then(function (accounts) {
      var requests = accounts.map(function (account) {
        return [
          new LedgerRequest([account], "monthly", _this.start_date, _this.end_date, false),
          new LedgerRequest([account], "monthly", _this.start_date, _this.end_date, true),
        ];
      }).reduce(function (a, b) { return a.concat(b); });
      return requests;

    }).then(function (ledgerRequests) {
      _this.loadRequests(ledgerRequests);

    }).catch(function (error) {
      console.error(error);
    })
}

Table.prototype.loadRequests = function (ledgerRequests) {
  var _this = this;

  var postRequests = ledgerRequests.map(function (lr) {
    return lr.to_request_object()
  });

  fetch(LedgerRequest.prototype.base_url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(postRequests)

  }).then(function (responses) {
    return responses.json();

  }).then(function (responsesJSON) {
    var requestResponsePairs = responsesJSON.map(function (r, i) {
      return {
        request: ledgerRequests[i],
        response: responsesJSON[i]
      };
    });
    return requestResponsePairs;

  }).then(_this.processData.bind(_this)

  ).catch(function (error) {
    console.error(error);
  })
};

Table.prototype.processData = function (convos) {
  var data = convos.reduce(function (agg, convo) {
    if (convo.response && convo.request) {
      var rows = convo.response.map(function (row) {
        // Javascript date parsing funkiness requires forward slashes to set
        // the timezone correctly
        var dateSlashes = row.date.replace(/-/g, '/');
        return {
          amount: row.amount,
          date: new Date(dateSlashes),
          account_name: convo.request.query,
          budget: convo.request.budget
        };
      });
      return agg.concat(rows);
    } else {
      return agg;
    }
  }, []);

  this.cache.set_data(data, 'data');

  var tableParts = tableHTML.dataToPivottedTableParts({
    data: data,
    columnKeys: [ 'date', 'budget' ],
    rowKeys: [ 'account_name' ]
  });

  var rowFormatter = function (r) {
    var chartOptions = {
      query: r.account_name,
      start_date: this.start_date.toLocaleDateString(),
      end_date: this.end_date.toLocaleDateString(),
      frequency: 'monthly'
    };
    var linkOptions = Object.keys(chartOptions).map(function (k) {
      return k + '=' + encodeURIComponent(chartOptions[k]);
    }).join('&');
    var linkHref = 'chart.html?' + linkOptions;
    var linkValue = '<a href="' + linkHref + '">' + r.account_name + '</a>';
    return {
      value: linkValue
    };
  };

  var columnFormatter = function (c) {
    return {
      value: c.date.toLocaleDateString() + (c.budget ? '\nbudget' : '')
    };
  };

  var dataFormatter = function (d) {
    var formattedData = {
      value: ''
    };

    if (d && d.amount) {
      formattedData.value = d.amount.toFixed(2);
    }

    if (d && d.amount && d.budget) {
      formattedData.attributes = {
        class: d.amount < 0 ? 'success' : 'danger'
      }
    }

    return formattedData;
  };

  var table = tableHTML.tablePartsToTable({
    tableParts: tableParts,
    formatterParts: {
      row: rowFormatter.bind(this),
      column: columnFormatter,
      data: dataFormatter
    }
  });

  var tableClasses = 'table table-striped table-hover table-bordered table-condensed';
  var HTML = tableHTML.tableToHTML(table, tableClasses);
  document.getElementById('thetable').innerHTML = HTML;
};

Table.prototype.downloadCSV = function () {
  var data = this.cache.get_data('data') || [];
  var filename = 'export.csv';

  var tableData = recordsCSV.dataToTable(data);
  var csvData = recordsCSV.tableToCSV(tableData);
  var csvString = 'data:text/csv;charset=utf-8,' + csvData;

  var link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvString));
  link.setAttribute('download', filename);
  link.click();
  link.remove();
};

var recordsCSV = {};

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
  var keys = new Set();
  data.forEach(function (obj) {
    Object.keys(obj).forEach(function (key) {
      keys.add(key);
    });
  });

  var headers = Array.from(keys.keys());
  var table = data.reduce(function (agg, rowObj) {
    var rowArray = headers.map(function (h) { return rowObj[h] || null; });
    return agg.concat([rowArray]);
  }, [headers]);

  return table;
};

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
  var csv = table.map(function (row) {
    return row.map(function (r) {
      return r === null ? '' : r.toString();
    }).join(',');
  }).join('\n');

  return csv;
};

var tableHTML = {};

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
  var keysSet = new ObjectSet();
  data.forEach(function (row) {
    var key = {};
    keys.map(function (k) {
      key[k] = row[k];
    });
    keysSet.add(key);
  });
  var keysArray = Array.from(keysSet.keys());
  return keysArray;
};

/**
 * Compare a and b by property in order of keys.
 *
 * Input:
 *  keys - array of string
 *  a - object
 *  b - object
 */
tableHTML.sortByComparator = function (keys, a, b) {
  var keysCopy = keys.slice();   // shallow copy
  var sortKey = keysCopy.shift();
  if (sortKey) {
    if (a[sortKey] < b[sortKey]) {
      return -1;
    } else if (a[sortKey] > b[sortKey]) {
      return 1;
    } else {
      return tableHTML.sortByComparator(keysCopy, a, b);
    }
  } else {
    return 0;
  }
};

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
  var columnHeaders = tableHTML.extractKeys(args.data, args.columnKeys);
  columnHeaders.sort(function (a, b) {
    return tableHTML.sortByComparator(args.columnKeys, a, b);
  });
  var rowHeaders = tableHTML.extractKeys(args.data, args.rowKeys);
  rowHeaders.sort(function (a, b) {
    return tableHTML.sortByComparator(args.rowKeys, a, b);
  });

  var filterData = function (data, header) {
    var filteredData = data.filter(function (d) {
      return Object.keys(header).every(function (k) {
        return JSON.stringify(header[k]) === JSON.stringify(d[k]);
      });
    });
    return filteredData;
  };
  var tableData = rowHeaders.map(function (rowHeader) {
    var rowData = filterData(args.data, rowHeader);
    var row = columnHeaders.map(function (columnHeader) {
      var columnData = filterData(rowData, columnHeader);
      if (columnData.length > 1) {
        console.error('More than one entry found for row: ' + JSON.stringify(rowHeader)
          + ', column: ' + JSON.stringify(columnHeader) + '. Using first match.');
      }
      return columnData[0];
    });
    return row;
  });
  return {
    rows: rowHeaders,
    columns: columnHeaders,
    data: tableData
  };
};

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
  var headerRow = [''].concat(args.tableParts.columns.map(args.formatterParts.column));
  var dataRows = args.tableParts.rows.map(function(r, i) {
    return [args.formatterParts.row(r)].concat(args.tableParts.data[i].map(args.formatterParts.data));
  });
  var table = [headerRow].concat(dataRows);
  return table;
};

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
  var attributesString = '';
  if (attributes) {
    attributesString = Object.keys(attributes).map(function (k) {
      return ' ' + k + '="' + attributes[k] + '"';
    }).join('');
  }
  var valueString = value || '';
  var tagBlock = '<' + tag + attributesString + '>' + valueString + '</' + tag + '>';
  return tagBlock;
};

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
  var HTML =
    '<table class="' + tableClasses + '">\n' +
    table.map(function (row) {
      var rowHTML =
        '\t<tr>\n' +
        row.map(function (c) {
          return '\t\t' + tableHTML.makeTag('td', c.value, c.attributes) + '\n';
        }).join('') +
        '\t</tr>\n';
      return rowHTML;
    }).join('') +
    '\n</table>';
  return HTML;
};

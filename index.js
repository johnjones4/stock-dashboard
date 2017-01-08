const blessed = require('blessed');
const request = require('request');
const async = require('async');
const contrib = require('blessed-contrib');
const config = require('./config');

const oneDay = 24 * 60 * 60 * 1000;

const spans = [
  {
    'name': 'Day',
    'value': oneDay
  },
  {
    'name': 'Week',
    'value': 7 * oneDay
  },
  {
    'name': 'Month',
    'value': 31 * oneDay
  },
  {
    'name': 'Quarter',
    'value': 3 * 31 * oneDay
  },
  {
    'name': 'Year',
    'value': 365 * oneDay
  },
  {
    'name': '5 Years',
    'value': 5 * 365 * oneDay
  }
];
let currentSpan = 0;
let currentSymbol = 0;

const screen = blessed.screen();

const line = contrib.line({
  'style': {
    'line': 'yellow',
    'text': 'yellow',
    'baseline': 'white'
  },
  'label': ''
});
screen.append(line);

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});

screen.key(['left'],function() {
  currentSpan++;
  if (currentSpan >= spans.length) {
    currentSpan = 0;
  }
  loadData();
});

screen.key(['right'],function() {
  currentSpan--;
  if (currentSpan < 0) {
    currentSpan = spans.length - 1;
  }
  loadData();
});

screen.key(['down'],function() {
  currentSymbol++;
  if (currentSymbol >= config.symbols.length) {
    currentSymbol = 0;
  }
  loadData();
});

screen.key(['up'],function() {
  currentSymbol--;
  if (currentSymbol < 0) {
    currentSymbol = config.symbols.length - 1;
  }
  loadData();
});

loadData();
const refreshRate = ((24 * 60 * 60 * 1000) / 5000) * config.symbols.length * 2;
setInterval(loadData,refreshRate);

function loadData() {
  const startDate = new Date(new Date().getTime() - spans[currentSpan].value);
  const endDate = new Date();
  request({
    'uri': 'https://api.intrinio.com/historical_data',
    'qs': {
      'identifier': config.symbols[currentSymbol],
      'item': 'open_price',
      'start_date': formattedDate(startDate),
      'end_date': formattedDate(endDate),
      'frequency': 'daily',
      'page_size': 10000000
    },
    'useQuerystring': true,
    'auth': {
      'user': config.auth.user,
      'pass': config.auth.pass,
      'sendImmediately': true
    },
    'json': true
  },function(err,res,result) {
    if (err) {
      console.error(err);
      process.exit(-1);
    } else if (result.errors) {
      console.error(err);
      process.exit(-1);
    } else if (result.data) {
      result.data.reverse();
      line.setLabel(result.identifier + ' For Past ' + spans[currentSpan].name);
      line.setData([{
        'x': result.data.map(function(row) {
          return row.date;
        }),
        'y': result.data.map(function(row) {
          return row.value;
        })
      }]);
      screen.render();
    }
  });
}

function formattedDate(date) {
  return [date.getFullYear(),date.getMonth()+1,date.getDate()].map(function(value) {
    return value < 10 ? ('0'+value) : value;
  }).join('-');
}

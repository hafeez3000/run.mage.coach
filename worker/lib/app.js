#!/usr/bin/env node

'use strict';

var RSMQWorker = require('rsmq-worker'),
  logSetup = require('./log'),
  path = require('path'),
  generateHtml = require('./generateHtml'),
  fs = require('fs-extra'),
  s3 = require('./s3'),
  async = require('async'),
  targz = require('tar.gz'),
  util = require('./util'),
  log = require('winston'),
  child_process = require('child_process');


var logLevel = process.env.LOG_LEVEL || 'info';
var logFile = process.env.LOG_FILE ||  'worker.log';

var args = process.argv.slice(2);
var analyzeInProgress = false;

log.add(log.transports.File, {
  filename: logFile,
  handleExceptions: true,
  level: logLevel,
  json: false
});

if (args.length !== 3) {
  log.info('Usage: node worker.js <FETCH_QUEUE_NAME> <DATA_DIR> <HOSTNAME>');
  process.exit(1);
}

var fetchQueue = args[0];
var dataDir = args[1];
var hostName = args[2];

var redisHost = process.env.REDIS_HOST;
var resultQueue = process.env.REDIS_RESULT_QUEUE;
var redisPassword = process.env.REDIS_PASSWORD;

if (!redisHost || !resultQueue || !redisPassword) {
  log.info('Missing env info, make sure REDIS is configured ' + JSON.stringify(process.env));
  process.exit(1);
}

var options = {
  host: redisHost,
  invisibletime: 120,
  timeout: 0,
  maxReceiveCount: 1,
  options: {
    'auth_pass': redisPassword
  }
};

var fetchWorker = new RSMQWorker(fetchQueue, options);
var resultWorker = new RSMQWorker(resultQueue, options);

fetchWorker.on('message', function(msg, next) {
  // got an message, lets parse it
  var mess = JSON.parse(msg);
  analyzeInProgress = true;
  startJob(mess, function() {
    next();
    analyzeInProgress = false;
  });
});

fetchWorker.on('error', function(err, msg) {
  log.error('Error fetching message ' + msg.id, err);
});

process.on('SIGTERM', function() {

  log.info('Got shutting signal from SIGTERM');
  fetchWorker.stop();
  log.info('Stopped the queue');

  async.whilst(
    function() {
      return analyzeInProgress;
    },
    function(callback) {
      log.info('Waiting on analyze to finish, wait one more second:'+ analyzeInProgress);
      setTimeout(callback, 1000);
    },
    function(err) {
      log.info('Exiting from SIGTERM, no jobs running');
      process.exit(0);
    }
  );
});

log.info('Starting worker listening on queue ' + fetchQueue + ' send result to queue ' + resultQueue);
fetchWorker.start();

function startJob(message, cb) {

  if (message.u === undefined) {
    log.error('Missing url for  ' + message);
    cb();
    return;
  }

  log.info('Starting testing:' + message.u);

  var outputPath = message.p + '/' + message.id;

  var config = {
    url: message.u,
    browser: message.b,
    connection: message.c,
    maxPagesToTest: message.m || 1,
    no: message.n || 1,
    deep: message.d || 0,
    outputPath: outputPath,
    dataDir: dataDir,
    id: message.id,
    hostname: hostName
  };

  var metrics = {};

//  console.log(config);

  log.debug('Starting job with url: ' + config.url + ' ' + message.id);

  async.series([
      function(callback) {
        resultWorker.send(JSON.stringify({
          id: message.id,
          status: 'running',
          hostname: hostName
        }), callback);
      },
      function(callback) {
          var workerCommand = '/start.sh --maxPagesToTest ' + config.maxPagesToTest + ' -d ' + config.deep + ' --browser ' + config.browser + ' -n ' + config.no + ' --outputFolder ' + config.dataDir+'sitespeed-result/'+config.outputPath + ' --connection ' + config.connection +  ' --seleniumServer http://127.0.0.1:4444/wd/hub --plugins.load analysisStorer ' + config.url;

//	  console.log(workerCommand);

        resultWorker.send(JSON.stringify({
          id: config.id,
          status: 'Running',
          hostname: config.hostname
        }));


	  child_process.exec(workerCommand, callback);
      },
      function(callback) {
          fs.rename(path.join(dataDir, 'sitespeed-result', outputPath, 'index.html'), path.join(dataDir,
              'sitespeed-result', outputPath, 'index2.html'), callback);
      },
      function(callback) {
        var data = {
          id: message.id,
          url: config.url,
          browser: util.capitalize(config.browser),
          location: util.getLocation(fetchQueue),
          connection: config.connection,
          link: 'index2.html',
          myUrl: 'https://report.mage.coach/' + outputPath + '/',
          stars: util.getStars(message.c, metrics.ruleScore, metrics.speedIndex),
          date: message.date,
          bodyId: util.getBodyId(message.c, metrics.ruleScore, metrics.speedIndex),
          boxTitle: util.getBoxTitle(message.c, metrics.ruleScore, metrics.speedIndex),
          boxDesciption: util.getBoxDescription(message.c, metrics.ruleScore, metrics.speedIndex)
        };

        // push the metrics
        Object.keys(metrics).forEach(function(key) {
          data[key] = metrics[key];
        });

        generateHtml.generate(path.join(dataDir, 'sitespeed-result', outputPath), data, callback);
      },
      function(callback) {
        var files = ['data/browsertime','data/yslow','data/summary.json','data/urls.txt', 'config.json', 'sitespeed.io.log', 'browsermobproxy.log', 'browsertime.log'];

        async.each(files, function(file, thecb) {
          fs.remove(path.join(dataDir, 'sitespeed-result', outputPath, file), thecb);

        }, function(err) {
          if (err) {
            log.error('Error removing files ', err);
          }
          callback(err);

        });
      },
      function(callback) {
        fs.copy(path.join(__dirname, '../assets/'), path.join(dataDir, 'sitespeed-result', outputPath), function(
          err) {
          if (err) {
            log.error('Error copying files ', err);
          }
          callback(err);
        });
      },
      function(callback) {
        var compress = new targz().compress(path.join(dataDir, 'sitespeed-result', outputPath), path.join(dataDir,
          'sitespeed-result', outputPath, message.id + '.tar.gz'), function(err) {

          if (err) {
            log.error('Error compressing files ', err);
          } else {
            log.debug('Compressing files finished');
          }

          callback(err);
        });
      },
      function(callback) {
        resultWorker.send(JSON.stringify({
          status: 'uploading',
          id: message.id
        }), callback);
      },
      function(callback) {
        s3.uploadDir(path.join(dataDir, 'sitespeed-result', outputPath), outputPath, callback);
      }
    ],
    // optional callback
    function(err, results) {
      if (err) {
        log.error('Sending failed message on queue for ' + message.u, err);
        resultWorker.send(JSON.stringify({
          status: 'failed',
          id: message.id,
          hostname: hostName
        }), cb);
      } else {

        var m = {
          status: 'done',
          id: message.id,
          hostname: hostName
        };

        log.info('Finished testing [ok]:' + message.u);

        // push all the metrics
        Object.keys(metrics).forEach(function(key) {
          m[key] = metrics[key];
        });

        resultWorker.send(JSON.stringify(m), cb);
      }
    });
}

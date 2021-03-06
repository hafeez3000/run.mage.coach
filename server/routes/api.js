'use strict';

var express = require('express'),
  db = require('../db'),
  log = require('winston');

var router = express.Router();

router.get('/', function(req, res) {
	res.json({
		message: 'The mage.coach online API'
	});
});

router.get('/status/:sessionId', function(req, res) {
	var sessionId = req.params.sessionId;
	log.debug('API access for ' + sessionId);
	db.getStatus(sessionId, function(err, status) {

    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', 0);

    if (err) {
			log.error(err);
			status = 'unknown';
		}
		res.json({
				status: status
			});
	});

});

module.exports = router;


/**
 * Sitespeed.io - How speedy is your site? (https://www.sitespeed.io)
 * Copyright (c) 2015, Peter Hedenskog, Tobias Lidskog
 * and other contributors
 * Released under the Apache 2.0 License
 */
'use strict';

var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
	res.render('faq/index', {
		layout: 'main',
		bodyId: 'faq',
		title: 'FAQ run.mage.coach',
		description: 'Everything you need to know about testing using mage.coach.'
	});
});

module.exports = router;

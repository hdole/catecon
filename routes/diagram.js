var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next)
{
	res.render('diagram');
});

router.get('/d/*', function(req, res, next)
{
	res.render('diagram');
});

module.exports = router;

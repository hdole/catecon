var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next)
{
console.log('diagram.js');
	const args = {title:'Integers'};
	res.render('diagram', args);
});

module.exports = router;

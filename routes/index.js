var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next)
{
	dbcon.query('SELECT * FROM diagrams ORDER BY timestamp DESC LIMIT 32;', (err, result) =>
	{
		if (err) throw err;
		res.render('index', {title:'Catecon: The Categorical Console', result});
	});
});

module.exports = router;

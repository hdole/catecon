// (C) 2018 Harry Dole
// Catecon:  The Categorical Console
//
if(typeof exports === "undefined")
{
	'user strict';
	exports = this;
}

const AWSConstants = function()
{
	this.init();
};

AWSConstants.prototype =
{
	init: function()
	{
		exports.CATECON_TOPIC =			'arn:aws:sns:us-west-1:395668725886:Catecon';
		exports.COGNITO_REGION =		'us-west-2';
		exports.DIAGRAM_BUCKET_NAME =	'catecon-diagrams';
		exports.DIAGRAM_TABLE =			'Catecon-diagrams';
		exports.DIAGRAMS_USERS =		'Catecon-users';
		exports.CT_TABLE =				'Catecon-ct';
		exports.IDENTITY_POOL_ID =		'us-west-2:d7948fb7-c661-4d0f-8702-bd3d0a3e40bf';
		exports.NEW_USER_QUEUE =		'https://sqs.us-west-2.amazonaws.com/395668725886/CateconNewUserQueue';
		exports.NEW_USER_TOPIC =		'arn:aws:sns:us-west-2:395668725886:CateconNewUser';
		exports.RECENT_DIAGRAM_TABLE =	'Catecon-recent';
		exports.REGION =				'us-west-1';
		exports.USERCOUNT =				10;
	}
};

exports.AWSConstants = new AWSConstants();

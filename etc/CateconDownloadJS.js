// (C) 2018 Harry Dole
// Catecon:  The Categorical Console
//
exports.handler = (event, context, callback) => {
    // TODO implement
    const response = {
        statusCode: 200,
        body: JSON.stringify('Hello from Lambda!')
    };
    callback(null, response);
};

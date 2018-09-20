'use strict';

module.exports = {
    createErrorResponse: (statusCode, message) => ({
        statusCode: statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: message || 'Incorrect id'
    })
};

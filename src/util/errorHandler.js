'use strict';

const logger = require('./logger.js');

module.exports = {
    createErrorResponse: (statusCode, message) => {
        logger.logSentryError(message, { statusCode: statusCode });
        return {
            statusCode: statusCode || 501,
            headers: { 'Content-Type': 'text/plain' },
            body: message || 'Incorrect id'
        };
    }
};

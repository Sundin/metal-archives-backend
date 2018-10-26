'use strict';

const logger = require('./logger');

const bandHandler = require('./bandHandler');

const createErrorResponse = (statusCode, message) => ({
    statusCode: statusCode || 501,
    headers: { 'Content-Type': 'text/plain' },
    body: message || 'Incorrect id'
});

module.exports = {
    crawlBands: (event, context, callback) => {
        const { letter } = event.pathParameters;
        logger.setupSentry();

        logger.info('Crawling bands');

        bandHandler.browseBands('A').then(band => {
            logger.info('Triggering callback');
            callback(null, { statusCode: 200, body: JSON.stringify(band) });
        }).catch(error => {
            logger.error('get band failed', error.message);
            callback(null, createErrorResponse(error.statusCode, error.message));
        });
    }
};

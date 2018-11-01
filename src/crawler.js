'use strict';

const logger = require('./util/logger');

const bandHandler = require('./bandHandler');

const createErrorResponse = (statusCode, message) => ({
    statusCode: statusCode || 501,
    headers: { 'Content-Type': 'text/plain' },
    body: message || 'Incorrect id'
});

module.exports = {
    crawlLetter: (event, context, callback) => {
        const { letter } = event.pathParameters;
        logger.setupSentry();

        logger.info('Crawling bands');

        bandHandler.browseBands('A').then(bandCount => {
            logger.info('Triggering callback');
            callback(null, { statusCode: 200, body: JSON.stringify(bandCount) + ' bands found for letter ' + letter });
        }).catch(error => {
            logger.error('get band failed', error.message);
            callback(null, createErrorResponse(error.statusCode, error.message));
        });
    },

    browseAllBands: () => {
        logger.setupSentry();

        logger.info('GET /browse_all_bands/');

        const ALL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'NBR', '~'];

        let count = 0;
        ALL_LETTERS.forEach(letter => {
            bandHandler.browseBands(letter).then(() => {
                count++;

                if (count >= ALL_LETTERS.length) {
                    logger.info('DONE!!!!!!!!!!!!!!!!!!');
                }
            });
        });
    }
};

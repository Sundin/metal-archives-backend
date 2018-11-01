'use strict';

const request = require('request-promise-native');

const logger = require('./util/logger');
const bandHandler = require('./bandHandler');

const createErrorResponse = (statusCode, message) => ({
    statusCode: statusCode || 501,
    headers: { 'Content-Type': 'text/plain' },
    body: message || 'Incorrect id'
});

module.exports = {
    crawlLetter: (event, context, callback) => {
        const { letter, startIndex, maxBands } = event.pathParameters;
        logger.setupSentry();

        logger.info('Crawling bands');

        browseBands(letter, startIndex, maxBands).then(response => {
            logger.info('Triggering callback');
            callback(null, { statusCode: 200, body: JSON.stringify(response.bandCount) + ' bands found for letter ' + letter + '. ' + response.addedCount + ' of them were added to the database.' });
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
        const startIndex = 0;
        const maxBands = 2;

        ALL_LETTERS.forEach(letter => {
            browseBands(letter, startIndex, maxBands).then(() => {
                count++;

                if (count >= ALL_LETTERS.length) {
                    logger.info('DONE!!!!!!!!!!!!!!!!!!');
                }
            });
        });
    }
};

function browseBands(letter, startIndex, maxBands) {
    return new Promise((resolve, reject) => {
        logger.setupSentry();

        logger.info('GET /browse_bands/' + letter);

        if (!letter || !startIndex || !maxBands) {
            reject(new Error('Incomplete query'));
        }

        request.get(process.env.SCRAPER_URL + '/browse_bands/' + letter).then(bands => {
            const bandCount = JSON.parse(bands).length;
            logger.info(bandCount + ' bands found for letter ' + letter);

            const parsedBandData = JSON.parse(bands);

            let promises = [];
            for (var i = startIndex; i < startIndex + maxBands; i++) {
                if (i > parsedBandData.length) {
                    break;
                }

                if (process.env.ENVIRONMENT === 'local') {
                    promises.push(
                        bandHandler.addBandToDatabaseUsingNewConnection(parsedBandData[i], false)
                    );
                } else {
                    promises.push(
                        request.post({
                            url: process.env.LAMBDA_BASE_URL + '/add-band',
                            body: parsedBandData[i],
                            json: true
                        })
                    );
                }
            }

            logger.info('Executing promises using ' + process.env.ENVIRONMENT + ' mode');

            return Promise.all(promises).then(() => {
                resolve({
                    bandCount: bandCount,
                    addedCount: promises.length
                });
            });
        }).catch(error => {
            logger.error('Failed browsing letter ' + letter + ' with status code: ' + error.statusCode);
            reject(new Error('Failed browsing letter ' + letter + ' with status code: ' + error.statusCode));
        });
    });
}


'use strict';

const mongoose = require('mongoose');

const logger = require('./util/logger.js');
const errorHandler = require('./util/errorHandler.js');

const Band = require('./models/band');

function countBands(letter) {
    logger.info('Counting bands starting with letter: ', letter);

    mongoose.connect(process.env.MONGODB_URI);
    mongoose.Promise = global.Promise;
    const db = mongoose.connection;

    return new Promise((resolve, reject) => {
        logger.info('searching...');

        return db.once('connected', () => {
            logger.info('connected to mongo');
            const upperCase = letter.toUpperCase().charAt(0);
            const lowerCase = letter.toLowerCase().charAt(0);
            const regex = new RegExp('(^' + upperCase + '.*)|(^' + lowerCase + '.*)');
            return Band.count({band_name: regex}).then(result => {
                logger.info('got result!');
                resolve(result);
            }).catch(error => {
                db.close();
                reject(error);
            });
        });
    });
}

module.exports = {
    countBands: (event, context, callback) => {
        const { letter } = event.pathParameters;

        logger.info('GET /count-bands/' + letter);

        countBands(letter).then(band => {
            logger.info('Triggering callback');
            callback(null, { statusCode: 200, body: JSON.stringify(band) });
        }).catch(error => {
            logger.error('get band failed', error.message);
            callback(null, errorHandler.createErrorResponse(error.statusCode, error.message));
        });
    }
};


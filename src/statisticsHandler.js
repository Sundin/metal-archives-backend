
'use strict';

const mongoose = require('mongoose');

const logger = require('./util/logger.js');
const errorHandler = require('./util/errorHandler.js');

const Band = require('./models/band');

function countBands(letter) {
    if (letter) {
        logger.info('Counting bands starting with letter: ', letter);
    } else {
        logger.info('Counting all bands in database');
    }

    mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true });
    mongoose.Promise = global.Promise;
    const db = mongoose.connection;

    return new Promise((resolve, reject) => {
        logger.info('searching...');

        return db.once('connected', () => {
            logger.info('connected to mongo');
            let regex = new RegExp('.*');
            if (letter) {
                const upperCase = letter.toUpperCase().charAt(0);
                const lowerCase = letter.toLowerCase().charAt(0);
                regex = new RegExp('(^' + upperCase + '.*)|(^' + lowerCase + '.*)');
            }
            return Band.countDocuments({band_name: regex}).then(bandCount => {
                logger.info('Found ' + bandCount + ' bands');
                db.close();
                resolve(bandCount);
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

        countBands(letter).then(bandCount => {
            const response = {
                letter: letter ? letter : 'all letters',
                bandCount: bandCount
            };
            logger.info('Triggering callback');
            callback(null, { statusCode: 200, body: JSON.stringify(response) });
        }).catch(error => {
            logger.error('get band failed', error.message);
            callback(null, errorHandler.createErrorResponse(error.statusCode, error.message));
        });
    }
};


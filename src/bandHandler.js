'use strict';

const mongoose = require('mongoose');
const request = require('request-promise-native');

const logger = require('./util/logger.js');
const errorHandler = require('./util/errorHandler.js');

const bandScraper = require('./bandScraper.js');
const Band = require('./models/band');
const Album = require('./models/album');

function getBand(id) {
    logger.info('Get band by id', id);

    mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true });
    mongoose.Promise = global.Promise;
    const db = mongoose.connection;

    return new Promise((resolve, reject) => {
        if (!id) {
            return reject(new Error('Missing parameters'));
        }

        logger.info('searching...');

        return db.once('connected', () => {
            logger.info('connected to mongo');
            return Band.find({_id: id}).then(result => {
                logger.info('got result!');

                const band = result[0];
                const ONE_DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
                const ONE_MONTH_AGO = Date.now() - 30 * ONE_DAY_IN_MILLISECONDS;
                if (!band || !band.last_crawl_timestamp || band.last_crawl_timestamp < ONE_MONTH_AGO) {
                    logger.info('Need to fetch band data from Metal Archives');
                    bandScraper.scrapeBandPage(id).then(bandData => {
                        addBandToDatabase(bandData, true).then(() => {
                            db.close();
                            resolve(bandData);
                        });
                    }).catch(error => {
                        db.close();
                        reject(error);
                    });
                } else {
                    logger.info('Band already in database');
                    db.close();
                    resolve(band);
                }
            }).catch(error => {
                db.close();
                reject(error);
            });
        });
    });
}

module.exports = {
    getBand: (event, context, callback) => {
        const { id } = event.pathParameters;
        logger.setupSentry();

        logger.info('GET /bands/' + id);

        return getBand(id).then(band => {
            logger.info('Triggering callback');
            callback(null, {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify(band)
            });
        }).catch(error => {
            logger.error('get band failed', error.message);
            callback(null, errorHandler.createErrorResponse(error.statusCode, error.message));
        });
    },

    searchForBandInMongoDB: (query) => {
        logger.setupSentry();

        logger.info('Searching for: ' + query);

        mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true });
        mongoose.Promise = global.Promise;
        const db = mongoose.connection;

        return new Promise((resolve, reject) => {
            return db.once('connected', () => {
                logger.info('connected to mongo');
                const regex = new RegExp(escapeRegex(query), 'gi');
                return Band.find({ 'band_name': regex }).then(foundBands => {
                    db.close();
                    resolve(foundBands);
                }).catch(error => {
                    db.close();
                    reject(error);
                });
            }).catch(error => {
                db.close();
                reject(error);
            });
        });
    },

    /* CRAWLER */

    addBandToDatabase: (event, context, callback) => {
        const bandData = JSON.parse(event.body);
        logger.setupSentry();

        logger.info('POST band ' + bandData.band_name);
        logger.info(bandData);

        addBandToDatabaseUsingNewConnection(bandData, false).then(() => {
            logger.info('Triggering callback');
            callback(null, { statusCode: 200 });
        }).catch(error => {
            logger.error('add band to database failed', error.message);
            callback(null, errorHandler.createErrorResponse(error.statusCode, error.message));
        });
    },

    addBandToDatabaseUsingNewConnection: (bandData) => {
        return addBandToDatabaseUsingNewConnection(bandData);
    }
};

/* DATABASE */

function addBandToDatabase(bandData, updateTimestamp) {
    if (updateTimestamp) {
        bandData.last_crawl_timestamp = Date.now();
    }

    return Band.findOneAndUpdate({_id: bandData._id}, bandData, {upsert: true, returnNewDocument: true}).then(() => {
        logger.info(bandData.band_name + ': band added to database');
        return Promise.resolve();
    }).catch(error => {
        logger.error(error);
        return Promise.reject(error);
    });
}

function addBandToDatabaseUsingNewConnection(bandData) {
    logger.info('addBandToDatabaseUsingNewConnection');

    mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true });
    mongoose.Promise = global.Promise;
    mongoose.set('useFindAndModify', false);
    const db = mongoose.connection;

    return new Promise((resolve, reject) => {
        if (!bandData) {
            return reject(new Error('Missing parameters'));
        }

        return db.once('connected', () => {
            logger.info('connected to mongo');

            return Band.findOneAndUpdate({_id: bandData._id}, bandData, {upsert: true, returnNewDocument: true}).then(() => {
                logger.info(bandData.band_name + ': band added to database');

                db.close();
                resolve();
            }).catch(error => {
                logger.error(error);
                db.close();
                reject(error);
            });
        });
    });
}

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '$&');
}

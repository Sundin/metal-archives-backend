'use strict';

const mongoose = require('mongoose');
const request = require('request-promise-native');

const logger = require('./util/logger.js');
const errorHandler = require('./util/errorHandler.js');

const Band = require('./models/band');
const Album = require('./models/album');

function getBand(bandName, id) {
    logger.info('Get band by id', id);

    mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true });
    mongoose.Promise = global.Promise;
    const db = mongoose.connection;

    return new Promise((resolve, reject) => {
        if (!id || !bandName) {
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
                    const url = process.env.SCRAPER_URL + '/bands/' + bandName + '/' + id;
                    request.get(url).then(bandData => {
                        addBandToDatabase(JSON.parse(bandData), true).then(() => {
                            db.close();
                            resolve(band);
                        });
                    }).catch(error => {
                        db.close();
                        reject(new Error(url + ' failed with status code: ' + error.statusCode));
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
        const { bandName, id } = event.pathParameters;
        logger.setupSentry();

        logger.info('GET /bands/' + bandName + '/' + id);

        getBand(bandName, id).then(band => {
            logger.info('Triggering callback');
            callback(null, { statusCode: 200, body: JSON.stringify(band) });
        }).catch(error => {
            logger.error('get band failed', error.message);
            callback(null, errorHandler.createErrorResponse(error.statusCode, error.message));
        });
    },

    searchForBand: (query) => {
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
                });
            }).catch(error => {
                db.close();
                reject(error);
            });
        });
    },

    /* CRAWLER */

    browseBands: (letter) => {
        return new Promise((resolve, reject) => {
            logger.setupSentry();

            logger.info('GET /browse_bands/' + letter);

            if (!letter) {
                reject(new Error('Incomplete query'));
            }

            request.get(process.env.SCRAPER_URL + '/browse_bands/' + letter).then(bands => {
                const bandCount = JSON.parse(bands).length;
                logger.info(bandCount + ' bands found for letter ' + letter);

                const parsedBandData = JSON.parse(bands);
                const startIndex = 2;
                const maxBands = 2;

                let promises = [];
                for (var i = startIndex; i < startIndex + maxBands; i++) {
                    promises.push(
                        addBandToDatabaseUsingNewConnection(parsedBandData[i], false)
                    );
                }
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
    },

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
    }
};

/* DATABASE */

function addBandToDatabase(bandData, updateTimestamp) {
    if (updateTimestamp) {
        bandData.last_crawl_timestamp = Date.now();
    }

    return Band.findOneAndUpdate({_id: bandData._id}, bandData, {upsert: true, returnNewDocument: true}).then(() => {
        logger.info(bandData.band_name + ': band added to database');

        if (bandData.discography) {
            return Promise.all(bandData.discography.map(album => {
                fetchAlbumFromMetalArchives(album);
            }));
        }
        return Promise.resolve();
    }).catch(error => {
        logger.error(error);
        return Promise.reject(error);
    });
}

function addBandToDatabaseUsingNewConnection(bandData, updateTimestamp) {
    logger.info('addBandToDatabaseUsingNewConnection');

    mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true });
    mongoose.Promise = global.Promise;
    const db = mongoose.connection;

    return new Promise((resolve, reject) => {
        if (!bandData) {
            return reject(new Error('Missing parameters'));
        }

        logger.info('searching...');

        return db.once('connected', () => {
            logger.info('connected to mongo');

            return Band.findOneAndUpdate({_id: bandData._id}, bandData, {upsert: true, returnNewDocument: true}).then(() => {
                logger.info(bandData.band_name + ': band added to database');

                // if (bandData.discography) {
                //     return Promise.all(bandData.discography.map(album => {
                //         fetchAlbumFromMetalArchives(album);
                //     }));
                // }
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

function addAlbumToDatabase(albumData) {
    Album.findOneAndUpdate({_id: albumData._id}, albumData, {upsert: true, returnNewDocument: true}).then(() => {
        logger.info(albumData.title + ': album added to database');
        return Promise.resolve();
    }).catch(error => {
        logger.error(error);
        return Promise.reject(error);
    });
}

/* SCRAPER */

function fetchAlbumFromMetalArchives(albumData) {
    const url = albumData.url.replace('https://www.metal-archives.com', process.env.SCRAPER_URL);
    request.get(url).then(album => {
        addAlbumToDatabase(JSON.parse(album));
    }).catch(error => {
        logger.error('Failed fetching ' + albumData.url + ' with status code: ' + error.statusCode);
    });
}

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '$&');
}

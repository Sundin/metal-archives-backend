'use strict';

const mongoose = require('mongoose');
const request = require('request-promise-native');

const logger = require('./util/logger.js');
const errorHandler = require('./util/errorHandler.js');

const Album = require('./models/album');

module.exports = {
    getAlbum: (event, context, callback) => {
        const { albumId } = event.pathParameters;
        logger.setupSentry();

        logger.info('GET /albums/' + albumId);

        getAlbumFromDb(albumId).then(albumData => {
            logger.info('Triggering callback');
            callback(null, {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify(albumData)
            });
        }).catch(dbError => {
            logger.info(dbError.message);
            scrapeAlbum(albumId).then(album => {
                addAlbumToDatabase(album).then(() => {
                    logger.info('Triggering callback');
                    callback(null, {
                        statusCode: 200,
                        headers: {
                            'Content-Type': 'application/json; charset=utf-8'
                        },
                        body: JSON.stringify(album)
                    });
                });
            }).catch(error => {
                logger.error('get album failed', error.message);
                callback(null, errorHandler.createErrorResponse(error.statusCode, error.message));
            });
        });
    }
};

function scrapeAlbum(albumId) {
    const url = `${process.env.SCRAPER_URL}/albums/_/_/${albumId}`;
    logger.info('Scraping ' + url);
    return new Promise((resolve, reject) => {
        request.get(url).then(albumData => {
            resolve(JSON.parse(albumData));
        }).catch(error => {
            logger.error('Failed fetching ' + url + ' with status code: ' + error.statusCode);
            reject(error);
        });
    });
}

function getAlbumFromDb(albumId) {
    return new Promise((resolve, reject) => {
        logger.info('Get album by id', albumId);

        if (!albumId) {
            return reject(new Error('Incomplete query'));
        }

        mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true });
        mongoose.Promise = global.Promise;
        const db = mongoose.connection;

        return db.once('connected', () => {
            return Album.find({_id: albumId}).then(result => {
                logger.info('found results in db');
                if (result.length > 1) {
                    logger.warn('MULTIPLE ALBUMS WITH SAME ID: ' + albumId + ' !!!!!!!!!!!!!!!!');
                }

                const album = result[0];

                if (!album) {
                    db.close();
                    return reject(new Error('Album not found in database'));
                }

                db.close();
                logger.info('album data is: ', album);
                return resolve(album);
            }).catch(error => {
                db.close();
                return reject(error);
            });
        }).catch(error => {
            db.close();
            return reject(error);
        });
    });
}

function addAlbumToDatabase(albumData) {
    logger.info('Saving album to database', albumData);
    return new Promise((resolve, reject) => {
        mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true });
        mongoose.Promise = global.Promise;
        mongoose.set('useFindAndModify', false);
        const db = mongoose.connection;

        return db.once('connected', () => {
            Album.findOneAndUpdate({_id: albumData._id}, albumData, {upsert: true, returnNewDocument: true}).then(() => {
                logger.info(albumData.title + ': album added to database');
                db.close();
                return resolve();
            }).catch(error => {
                logger.error(error);
                db.close();
                return reject(error);
            });
        });
    });
}

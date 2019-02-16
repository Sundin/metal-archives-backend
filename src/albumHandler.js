'use strict';

const mongoose = require('mongoose');

const logger = require('./util/logger.js');
const errorHandler = require('./util/errorHandler.js');

const Album = require('./models/album');

module.exports = {
    // Note: maybe /album/:band/:title/:id, in case we need to crawl Metal Archives
    getAlbum: (event, context, callback) => {
        const { albumId } = event.pathParameters;
        logger.setupSentry();

        logger.info('GET /albums/' + albumId);

        getAlbum(albumId).then(album => {
            logger.info('Triggering callback');
            callback(null, {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify(album)
            });
        }).catch(error => {
            logger.error('get album failed', error.message);
            callback(null, errorHandler.createErrorResponse(error.statusCode, error.message));
        });
    }
};

function getAlbum(albumId) {
    return new Promise((resolve, reject) => {
        logger.info('Get album by id', albumId);

        if (!albumId) {
            return reject(new Error('Incomplete query'));
        }

        mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true });
        mongoose.Promise = global.Promise;
        const db = mongoose.connection;

        return db.once('connected', () => {
            return Album.find({_id: albumId}, (error, result) => {
                if (error) {
                    reject(error);
                    db.close();
                }

                if (result.length > 1) {
                    logger.warn('MULTIPLE ALBUMS WITH SAME ID: ' + albumId + ' !!!!!!!!!!!!!!!!');
                }

                const album = result[0];
                resolve(album);
                db.close();
            });
        });
    });
}

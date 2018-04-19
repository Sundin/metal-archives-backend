'use strict';

const mongoose = require('mongoose');

const logger = require('./logger');
const Album = require('./models/album');

module.exports = {
    // Note: maybe /album/:band/:title/:id, in case we need to crawl Metal Archives
    getAlbum: (albumId) => {
        return new Promise((resolve, reject) => {
            logger.info('Get album by id', albumId);

            if (!albumId) {
                return reject(new Error('Incomplete query'));
            }

            mongoose.connect(process.env.MONGODB_URI, { useMongoClient: true });
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
};

'use strict';

const mongoose = require('mongoose');

const Album = require('./models/album');

module.exports = {
    // Note: maybe /album/:band/:title/:id, in case we need to crawl Metal Archives
    getAlbum: (album_id) => {
        return new Promise((resolve, reject) => {
            console.log('GET /albums/' + album_id);

            if (!album_id) {
                reject(new Error('Incomplete query'));
            }

            mongoose.connect(process.env.MONGODB_URI, { useMongoClient: true });
            mongoose.Promise = global.Promise;
            const db = mongoose.connection;

            db.once('connected', () => {
                Album.find({_id: album_id}, (error, result) => {
                    if (error) {
                        console.log(error);
                        reject(error);
                        db.close();
                    }

                    if (result.length > 1) {
                        console.log('MULTIPLE ALBUMS WITH SAME ID: ' + album_id + ' !!!!!!!!!!!!!!!!');
                    }

                    const album = result[0];
                    resolve(album);
                    db.close();
                });
            });
        });
    }
};

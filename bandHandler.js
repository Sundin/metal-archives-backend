'use strict';

const mongoose = require('mongoose');

const request = require('request-promise-native');

const Band = require('./models/band');
const Album = require('./models/album');
const Member = require('./models/member');

module.exports = {
    getBand: (band_name, id) => {
        console.log('GET /bands/' + band_name + '/' + id);

        mongoose.connect(process.env.MONGODB_URI, { useMongoClient: true });
        mongoose.Promise = global.Promise;
        const db = mongoose.connection;

        return new Promise(function(resolve, reject) {
            if (!id || !band_name) {
                console.error('missing params');
                reject(new Error('Incomplete error'));
            }

            console.log('searching...');

            db.once('connected', () => {
                console.log('connected to mongo');
                Band.find({_id: id}).then(result => {
                    console.log('got result!');
                    
                    const band = result[0];
                    const ONE_DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
                    const ONE_MONTH_AGO = Date.now() - 30 * ONE_DAY_IN_MILLISECONDS;
                    if (!band || !band.lastCrawlTimestamp || band.lastCrawlTimestamp < ONE_MONTH_AGO) {
                        console.log('Need to fetch band data from Metal Archives');
                        const url = process.env.SCRAPER_URL + '/bands/' + band_name + '/' + id;
                        request.get(url).then(bandData => {
                            resolve(band);
                            db.close();
                            addBandToDatabase(JSON.parse(bandData), true);
                        }).catch(error => {
                            console.log(url + ' failed with status code: ' + error.statusCode);
                        });
                    } else {
                        console.log('Band already in database');
                        resolve(band);
                        db.close();
                    }        
                }).catch(error => {
                    console.log(error);
                    reject(error);
                    db.close();
                });
            });
        });
    },

    /* CRAWLER */

    browseAllBands: () => {
        log('GET /browse_all_bands/');

        const ALL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'NBR', '~'];

        let count = 0;
        ALL_LETTERS.forEach(letter => {
            browseLetter(letter).then(result => {
                count++;

                if (count >= ALL_LETTERS.length) {
                    log('DONE!!!!!!!!!!!!!!!!!!');
                }
            });
        });
    },

    browseBands: (letter) => {
        return new Promise((resolve, reject) => {
            log('GET /browse_bands/' + letter);

            if (!letter) {
                reject(new Error('Incomplete query'));
            }

            request.get(process.env.SCRAPER_URL + '/browse_bands/' + letter).then(bands => {
                log(JSON.parse(bands).length + ' bands found for letter ' + letter);
                resolve(bands);

                JSON.parse(bands).forEach(band => {
                    addBandToDatabase(band, false);
                });
            }).catch(error => {
                log('Failed browsing letter ' + letter + ' with status code: ' + error.statusCode);
            });
        });
    }
};

/* DATABASE */

function addBandToDatabase(bandData, updateTimestamp) {
    if (updateTimestamp) {
        bandData.lastCrawlTimestamp = Date.now();
    }

    Band.findOneAndUpdate({_id: bandData._id}, bandData, {upsert: true, returnNewDocument: true}, function (error, data) {
        if (error) {
            return console.error(error);
        }
        log(bandData.band_name + ': band added to database');
    });

    if (bandData.discography) {
        bandData.discography.forEach(album => {
            fetchAlbumFromMetalArchives(album);
        });
    }
}

function addAlbumToDatabase(albumData) {
    Album.findOneAndUpdate({_id: albumData._id}, albumData, {upsert: true, returnNewDocument: true}, function (error, data) {
        if (error) {
            return console.error(error);
        }
        log(albumData.title + ': album added to database');
    });
}

/* CRAWLER */

function browseLetter(letter) {
    return request.get(process.env.SCRAPER_URL + '/browse_bands/' + letter).then(bands => {
        log(JSON.parse(bands).length + ' bands found for letter ' + letter);

        JSON.parse(bands).forEach(band => {
            addBandToDatabase(band, false);
        });
        return Promise.resolve(true);
    }).catch(error => {
        log('Failed browsing letter ' + letter + ' with status code: ' + error.statusCode);
        return Promise.resolve(false);
    });
}

/* SCRAPER */

function fetchAlbumFromMetalArchives(albumData) {
    const url = albumData.url.replace('https://www.metal-archives.com', process.env.SCRAPER_URL);
    request.get(url).then(albumData => {
        addAlbumToDatabase(JSON.parse(albumData));
    }).catch(error => {
        log('Failed fetching ' + albumData.url + ' with status code: ' + error.statusCode);
    });
}

/* UTIL */

function log(message) {
    console.log(message);
}
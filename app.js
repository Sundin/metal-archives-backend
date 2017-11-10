'use strict';

require('dotenv').config();

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const mongoosastic = require('mongoosastic');
mongoose.connect('mongodb://localhost/metallic-avenger', { useMongoClient: true });
mongoose.Promise = global.Promise;

const request = require('request-promise-native');

const Band = require('./models/band');
const Album = require('./models/album');
const Member = require('./models/member');

const elasticsearch = require('elasticsearch');
const elasticsearchClient = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'trace'
});

elasticsearchClient.ping({
    requestTimeout: 3000
}, function (error) {
    if (error) {
      console.trace('ElasticSearch cluster is down!');
      log(error);
    } else {
      log('ElasticSearch working properly');
    }
});

app.listen(3001, () => {
    log('Example app listening on port 3001!');
});

//indexDatabase();

function indexDatabase() {
    indexModel(Band);
    indexModel(Album);
    indexModel(Member);
}

function indexModel(model) {
    var stream = model.synchronize();
    var count = 0;

    log('indexing database...');
    
    stream.on('data', function(err, doc) {
      count++;
    });
    stream.on('close', function() {
      log('indexed ' + count + ' documents!');
    });
    stream.on('error', function(err) {
      log(err);
    });
}

/* ENDPOINTS */

app.get('/', (req, res) => {
  res.send();
});

app.get('/bands/:band_name/:id', (req, res) => {
    const band_name = req.params.band_name;
    const id = req.params.id;

    log('GET /bands/' + band_name + '/' + id);

    if (!id || !band_name) {
        return res.status(400).send('Incomplete query');
    }

    Band.find({_id: id}, (error, result) => {
        if (error) {
            log(error);
            res.status(500).send(error);
        }
        const band = result[0];
        const ONE_DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
        const ONE_MONTH_AGO = Date.now() - 30 * ONE_DAY_IN_MILLISECONDS;
        if (!band || !band.lastCrawlTimestamp || band.lastCrawlTimestamp < ONE_MONTH_AGO) {
            log('Need to fetch band data from Metal Archives');
            const url = process.env.SCRAPER_URL + '/bands/' + band_name + '/' + id;
            request.get(url).then(bandData => {
                res.send(bandData);
                addBandToDatabase(JSON.parse(bandData), true);
            }).catch(error => {
                log(url + ' failed with status code: ' + error.statusCode);
            });
        } else {
            res.send(band);
        }        
    });
});

//Note: maybe /album/:band/:title/:id, in case we need to crawl Metal Archives
app.get('/albums/:album_id', (req, res) => {
    const album_id = req.params.album_id;

    log('GET /albums/' + album_id);
    
    if (!album_id) {
        return res.status(400).send('Incomplete query');
    }

    Album.find({_id: album_id}, (error, result) => {
        if (error) {
            log(error);
            res.status(500).send(error);
        }

        if (result.length > 1) {
            log('MULTIPLE ALBUMS WITH SAME ID: ' + album_id + ' !!!!!!!!!!!!!!!!');
        }

        const album = result[0];
        res.send(album);
    });
});

app.get('/search/:query', (req, res) => {
    const query = req.params.query;

    log('GET /search/' + query);

    if (!query) {
        return res.status(400).send('Incomplete query');
    }

    log('searching for: ' + query);
    Promise.all([
        searchBand(query),
        searchAlbum(query)
    ]).then(results => {
        res.send(results);
    }).catch(error => {
        log(error);
    });
});

/* CRAWLER */

const ALL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'NBR', '~'];

app.get('/browse_all_bands', (req, res) => {
    log('GET /browse_all_bands/');

    let count = 0;
    ALL_LETTERS.forEach(letter => {
        browseLetter(letter).then(result => {
            count++;

            if (count >= ALL_LETTERS.length) {
                log('DONE!!!!!!!!!!!!!!!!!!');
            }
        });
    });
});

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

app.get('/browse_bands/:letter', (req, res) => {
    const letter = req.params.letter;

    log('GET /browse_bands/' + letter);

    if (!letter) {
        return res.status(400).send('Incomplete query');
    }

    request.get(process.env.SCRAPER_URL + '/browse_bands/' + letter).then(bands => {
        log(JSON.parse(bands).length + ' bands found for letter ' + letter);
        res.send(bands);

        JSON.parse(bands).forEach(band => {
            addBandToDatabase(band, false);
        });
    }).catch(error => {
        log('Failed browsing letter ' + letter + ' with status code: ' + error.statusCode);
    });
});

/* SEARCH */

function searchBand(query) {
    return new Promise(function(resolve, reject) {
        Band.search({
            match: {
                band_name: {
                    query: query,
                    fuzziness: 'auto'
                }
            }
        }, function(error, results) {
            if (error) {
                reject(error)
            }
            resolve(results);
        });
    });
}

function searchAlbum(query) {
    return new Promise(function(resolve, reject) {
        Album.search({
            match: {
                title: {
                    query: query,
                    fuzziness: 'auto'
                }
            }
        }, function(error, results) {
            if (error) {
                reject(error)
            }
            resolve(results);
        });
    });
}

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

/* SCRAPER */

function fetchAlbumFromMetalArchives(albumData) {
    const url = albumData.url.replace('https://www.metal-archives.com', process.env.SCRAPER_URL);
    request.get(url).then(albumData => {
        addAlbumToDatabase(JSON.parse(albumData));
    }).catch(error => {
        log('Failed fetching ' + albumData.url + ' with status code: ' + error.statusCode);
    });
}

function log(message) {
    console.log(message);
}
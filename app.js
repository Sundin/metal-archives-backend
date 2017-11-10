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
      console.log(error);
    } else {
      console.log('ElasticSearch working properly');
    }
});

app.listen(3001, () => {
    console.log('Example app listening on port 3001!');
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

    console.log('indexing database...');
    
    stream.on('data', function(err, doc) {
      count++;
    });
    stream.on('close', function() {
      console.log('indexed ' + count + ' documents!');
    });
    stream.on('error', function(err) {
      console.log(err);
    });
}

/* ENDPOINTS */

app.get('/', (req, res) => {
  res.send();
});

app.get('/bands/:band_name/:id', (req, res) => {
    const band_name = req.params.band_name;
    const id = req.params.id;

    if (!id || !band_name) {
        return res.status(400).send('Incomplete query');
    }

    Band.find({_id: id}, (error, result) => {
        if (error) {
            console.log(error);
            res.status(500).send(error);
        }
        const band = result[0];
        if (!band || !band.lastCrawlTimestamp) {
            // TODO: Also make a new fetch if timestamp is too old (>1 month?)
            console.log('Need to fetch band data from Metal Archives');
            request.get(process.env.SCRAPER_URL + '/bands/' + band_name + '/' + id).then(bandData => {
                res.send(bandData);
                addBandToDatabase(JSON.parse(bandData), true);
            }).catch(error => {
                console.log(error);
            });
        } else {
            res.send(band);
        }        
    });
});

//Note: maybe /album/:band/:title/:id, in case we need to crawl Metal Archives
app.get('/albums/:album_id', (req, res) => {
    const album_id = req.params.album_id;
    
    if (!album_id) {
        return res.status(400).send('Incomplete query');
    }

    Album.find({_id: album_id}, (error, result) => {
        if (error) {
            console.log(error);
            res.status(500).send(error);
        }
        const album = result[0];
        res.send(album);
    });
});

app.get('/search/:query', (req, res) => {
    const query = req.params.query;

    if (!query) {
        return res.status(400).send('Incomplete query');
    }

    console.log('searching for:', query);
    Promise.all([
        searchBand(query),
        searchAlbum(query)
    ]).then(results => {
        res.send(results);
    }).catch(error => {
        console.log(error);
    });
});

/* CRAWLER */

app.get('/browse_bands/:letter', (req, res) => {
    const letter = req.params.letter;

    if (!letter) {
        return res.status(400).send('Incomplete query');
    }

    request.get(process.env.SCRAPER_URL + '/browse_bands/' + letter).then(bands => {
        console.log(JSON.parse(bands).length + ' bands found for letter ' + letter);
        res.send(bands);

        JSON.parse(bands).forEach(band => {
            addBandToDatabase(band, false);
        });
    }).catch(error => {
        console.log(error);
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

    Band.findOneAndUpdate({_id: bandData._id}, bandData, {upsert: true}, function (error, data) {
        if (error) {
            return console.error(error);
        }
        console.log(bandData.band_name + ': ok');
    });

    if (bandData.discography) {
        bandData.discography.forEach(album => {
            fetchAlbumFromMetalArchives(album);
        });
    }
}

function addAlbumToDatabase(albumData) {
    Album.findOneAndUpdate({_id: albumData._id}, albumData, {upsert: true}, function (error, data) {
        if (error) {
            return console.error(error);
        }
        console.log(albumData.title + ': ok');
    });
}

/* SCRAPER */

function fetchAlbumFromMetalArchives(albumData) {
    const url = albumData.url.replace('https://www.metal-archives.com', process.env.SCRAPER_URL);
    request.get(url).then(albumData => {
        addAlbumToDatabase(JSON.parse(albumData));
    }).catch(error => {
        console.log(error);
    });
}

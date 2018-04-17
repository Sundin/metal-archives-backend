'use strict';

const mongoose = require('mongoose');
const mongoosastic = require('mongoosastic');
mongoose.connect(process.env.MONGODB_URI, { useMongoClient: true });
mongoose.Promise = global.Promise;

const request = require('request-promise-native');

const Band = require('./models/band');
const Album = require('./models/album');
const Member = require('./models/member');

const elasticsearch = require('elasticsearch');
const elasticsearchClient = new elasticsearch.Client({
    host: process.env.ELASTICSEARCH_URL,
    log: 'trace'
});

elasticsearchClient.ping({
    requestTimeout: 3000
}, function(error) {
    if (error) {
        console.trace('ElasticSearch cluster is down!');
        log(error);
    } else {
        log('ElasticSearch working properly');
    }
});


module.exports = {
    search: (query) => {
        return new Promise((resolve, reject) => {
            log('GET /search/' + query);

            if (!query) {
                reject(new Error('Incomplete query'));
            }

            log('searching for: ' + query);
            return Promise.all([
                searchBand(query),
                searchAlbum(query)
            ]).then(([bands, albums]) => {
                log('Found results');
                // TODO: album results
                resolve({
                    query: query,
                    search_results: bands.hits.hits
                });
            }).catch(error => {
                log(error);
            });
        });
    }
};

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
                reject(error);
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
                reject(error);
            }
            resolve(results);
        });
    });
}

/* UTIL */

function log(message) {
    console.log(message);
}

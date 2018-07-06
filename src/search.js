'use strict';

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI, { useMongoClient: true });
mongoose.Promise = global.Promise;

const mongoosastic = require('mongoosastic');

const logger = require('./logger');

const Band = require('./models/band');
const Album = require('./models/album');

const elasticsearch = require('elasticsearch');
const elasticsearchClient = new elasticsearch.Client({
    host: process.env.ELASTICSEARCH_URL,
    log: 'trace'
});

function connect() {
    return new Promise((resolve, reject) => {
        elasticsearchClient.ping({
            requestTimeout: 3000
        }, function(error) {
            if (error) {
                logger.error('ElasticSearch cluster is down!');
                reject(new Error('ElasticSearch cluster is down!'));
            } else {
                logger.info('ElasticSearch working properly');
                resolve();
            }
        });
    });
}

module.exports = {
    search: (query) => {
        return new Promise((resolve, reject) => {
            logger.info('Searching for ' + query);

            if (!query) {
                reject(new Error('Incomplete query'));
            }

            return connect().then(() => {
                return Promise.all([
                    searchBand(query),
                    //searchAlbum(query)
                ]).then(([bands]) => {
                    logger.info('Found results');
                    // TODO: album results
                    resolve({
                        query: query,
                        search_results: bands.hits.hits
                    });
                });
            }).catch(error => {
                logger.error(error);
                reject(error);
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

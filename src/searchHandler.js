'use strict';

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true });
mongoose.Promise = global.Promise;

// const mongoosastic = require('mongoosastic');

const logger = require('./util/logger.js');
const errorHandler = require('./util/errorHandler.js');

const bandHandler = require('./bandHandler');
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
    search: (event, context, callback) => {
        const { query } = event.pathParameters;
        logger.setupSentry();

        if (!query) {
            callback(null, errorHandler.createErrorResponse(400, 'No search query'));
        }

        bandHandler.searchForBand(query).then(foundBands => {
            logger.info('Triggering callback');
            callback(null, { statusCode: 200, body: JSON.stringify(foundBands) });
        }).catch(error => {
            logger.error('search failed', error.message);
            callback(null, errorHandler.createErrorResponse(error.statusCode, error.message));
        });
    },

    searchUsingElasticSearch: (event, context, callback) => {
        const { query } = event.pathParameters;
        logger.setupSentry();

        logger.info('GET /search/' + query);

        const searchHandler = require('./searchHandler');

        search(query).then(results => {
            logger.info('Triggering callback');
            callback(null, { statusCode: 200, body: JSON.stringify(results) });
        }).catch(error => {
            logger.error('search failed', error.message);
            callback(null, errorHandler.createErrorResponse(error.statusCode, error.message));
        });
    }
};

function search(query) {
    return new Promise((resolve, reject) => {
        logger.info('Searching for ' + query);

        if (!query) {
            reject(new Error('Incomplete query'));
        }

        return connect().then(() => {
            return Promise.all([
                searchBand(query)
                // searchAlbum(query)
            ]).then(([bands]) => {
                logger.info('Found ' + bands.hits.hits.length + ' results');
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

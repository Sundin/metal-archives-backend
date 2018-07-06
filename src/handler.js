'use strict';

require('dotenv').config();

const logger = require('./logger');

const bandHandler = require('./bandHandler');

const createErrorResponse = (statusCode, message) => ({
    statusCode: statusCode || 501,
    headers: { 'Content-Type': 'text/plain' },
    body: message || 'Incorrect id'
});

module.exports = {
    getBand: (event, context, callback) => {
        const { bandName, id } = event.pathParameters;

        logger.info('GET /bands/' + bandName + '/' + id);

        bandHandler.getBand(bandName, id).then(band => {
            logger.info('Triggering callback');
            callback(null, { statusCode: 200, body: JSON.stringify(band) });
        }).catch(error => {
            logger.error('get band failed', error.message);
            callback(null, createErrorResponse(error.statusCode, error.message));
        });
    },

    getAlbum: (event, context, callback) => {
        const { albumId } = event.pathParameters;

        logger.info('GET /albums/' + albumId);

        const albumHandler = require('./albumHandler');

        albumHandler.getAlbum(albumId).then(album => {
            logger.info('Triggering callback');
            callback(null, { statusCode: 200, body: JSON.stringify(album) });
        }).catch(error => {
            logger.error('get album failed', error.message);
            callback(null, createErrorResponse(error.statusCode, error.message));
        });
    },

    search: (event, context, callback) => {
        const { query } = event.pathParameters;

        logger.info('GET /search/' + query);

        const searchHandler = require('./search');

        searchHandler.search(query).then(results => {
            logger.info('Triggering callback');
            callback(null, { statusCode: 200, body: JSON.stringify(results) });
        }).catch(error => {
            logger.error('search failed', error.message);
            callback(null, createErrorResponse(error.statusCode, error.message));
        });
    }
};

'use strict';

require('dotenv').config();

const logger = require('./logger');

const bandHandler = require('./bandHandler');
const albumHandler = require('./albumHandler');

const createErrorResponse = (statusCode, message) => ({
    statusCode: statusCode || 501,
    headers: { 'Content-Type': 'text/plain' },
    body: message || 'Incorrect id'
});

module.exports = {
    getBand: (event, context, callback) => {
        const { bandName, id } = event.pathParameters;

        logger.info('Get band by id', id);

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

        logger.info('Get album by id', albumId);

        albumHandler.getAlbum(albumId).then(album => {
            logger.info('Triggering callback');
            callback(null, { statusCode: 200, body: JSON.stringify(album) });
        }).catch(error => {
            logger.error('get album failed', error.message);
            callback(null, createErrorResponse(error.statusCode, error.message));
        });
    }
};

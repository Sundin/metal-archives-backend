'use strict';

require('dotenv').config();

const bandHandler = require('./bandHandler');
const albumHandler = require('./albumHandler');

const createErrorResponse = (statusCode, message) => ({
    statusCode: statusCode || 501,
    headers: { 'Content-Type': 'text/plain' },
    body: message || 'Incorrect id'
});

module.exports = {
    getBand: (event, context, callback) => {
        const { band_name, id } = event.pathParameters;

        console.log('Get band by id', id);

        bandHandler.getBand(band_name, id).then(band => {
            console.log('Triggering callback');
            callback(null, { statusCode: 200, body: JSON.stringify(band) });
        }).catch(error => {
            callback(null, createErrorResponse(error.statusCode, error.message));
        });
    },

    getAlbum: (event, context, callback) => {
        const { album_id } = event.pathParameters;

        console.log('Get album by id', album_id);

        albumHandler.getAlbum(album_id).then(album => {
            console.log('Triggering callback');
            callback(null, { statusCode: 200, body: JSON.stringify(album) });
        }).catch(error => {
            callback(null, createErrorResponse(error.statusCode, error.message));
        });
    }
};

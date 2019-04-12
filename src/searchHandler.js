'use strict';

const cheerio = require('cheerio');
const request = require('request-promise-native');

const logger = require('./util/logger.js');
const errorHandler = require('./util/errorHandler.js');

module.exports = {
    search: (event, context, callback) => {
        const { query } = event.pathParameters;
        logger.setupSentry();

        if (!query) {
            callback(null, errorHandler.createErrorResponse(400, 'No search query'));
        }

        searchOnMetalArchives(query).then(foundBands => {
            logger.info(`Got ${foundBands.length} results. Triggering callback`);
            callback(null, {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify(foundBands)
            });
        }).catch(error => {
            logger.error('search failed', error.message);
            callback(null, errorHandler.createErrorResponse(error.statusCode, error.message));
        });
    }
};

function searchOnMetalArchives(query) {
    return new Promise(function(resolve, reject) {
        const url = `https://www.metal-archives.com/search/ajax-band-search/?field=name&query=${query}*`;
        return request.get(url).then(body => {
            logger.info('Got results from metal archives');

            const jsonData = JSON.parse(body);
            const results = jsonData.aaData;

            let foundBands = [];
            results.forEach(result => {
                const $ = cheerio.load(result[0]);
                // TODO: we are ignoring "A.K.A" section of band name for now
                const bandName = $('a').text();
                const bandUrl = $('a').attr('href');
                const splitUrl = bandUrl.split('/');
                const id = splitUrl[splitUrl.length - 1];
                let band = {
                    band_name: bandName,
                    url: process.env.LAMBDA_BASE_URL + '/bands/' + id,
                    genre: result[1],
                    country: result[2],
                    _id: id
                };
                foundBands.push(band);
            });
            resolve(foundBands);
        }).catch(error => {
            reject(new Error(url + ' failed with status code: ' + error.statusCode));
        });
    });
}

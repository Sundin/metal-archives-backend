'use strict';

module.exports.getEnvVars = () => ({
    SCRAPER_URL: process.env.SCRAPER_URL,
    MONGODB_URI: process.env.MONGODB_URI,
    ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL,
    PORT: process.env.PORT,
    AWS_PROFILE: process.env.AWS_PROFILE ? process.env.AWS_PROFILE : ''
});

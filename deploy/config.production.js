'use strict';

require('dotenv').config({path: __dirname + '/production.env'});

console.log('Running lambda with production configuration');

const config = require('./environmentVariables.js');
module.exports.getEnvVars = config.getEnvVars;

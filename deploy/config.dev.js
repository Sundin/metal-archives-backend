'use strict';

require('dotenv').config();

console.log('Running lambda with local configuration');

const config = require('./environmentVariables.js');
module.exports.getEnvVars = config.getEnvVars;

/* eslint-disable no-console */

'use strict';

module.exports = {
    info: (message, object) => {
        console.log(message, object || '');
    },

    warn: (message, object) => {
        console.warn(message, object || '');
    },

    error: (message, object) => {
        console.error(message, object || '');
    }
};

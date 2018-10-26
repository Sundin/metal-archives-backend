/* eslint-disable no-console */

'use strict';

require('dotenv').config();
var Raven = require('raven');

let useSentry = false;

module.exports = {
    info: (message, object) => {
        console.log(message, object || '');
    },

    warn: (message, object) => {
        console.warn(message, object || '');
    },

    error: (message, object) => {
        if (!useSentry) {
            console.error(message, object || '');
            return;
        }

        Raven.captureMessage(message, {
            level: 'error',
            extra: object || {}
        }, function(err, eventId) {
            // The message has now been sent to Sentry
        });
    },

    setupSentry: () => {
        if (process.env.NODE_ENV !== 'production' || !process.env.SENTRY_KEY) {
            return;
        }

        Raven.config(process.env.SENTRY_KEY, {
            autoBreadcrumbs: true
        }).install();
        useSentry = true;
    }
};

/* eslint-disable no-console */

'use strict';

require('dotenv').config();
const Raven = require('raven');

module.exports = {
    info: (message, object) => {
        console.log(message, object || '');
    },

    warn: (message, object) => {
        console.warn(message, object || '');
    },

    error: (message, object) => {
        logSentryError(message, object);
        console.error(message, object || '');
    },

    setupSentry: () => {
        Raven.config(process.env.SENTRY_KEY, {
            autoBreadcrumbs: true
        }).install();
    },

    logSentryError: (message, object) => {
        logSentryError(message, object);
    }
};

function logSentryError(message, object) {
    const environment = process.env.ENVIRONMENT;
    Raven.captureMessage(message, {
        level: 'error',
        extra: object || {},
        tags: {
            environment: environment
        }
    }, function(err, eventId) {
        // The message has now been sent to Sentry
    });
}

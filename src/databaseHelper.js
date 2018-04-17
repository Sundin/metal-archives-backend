'use strict';

const mongoose = require('mongoose');

const Band = require('./models/band');
const Album = require('./models/album');
const Member = require('./models/member');

function indexDatabase() {
    mongoose.connect(process.env.MONGODB_URI, { useMongoClient: true });
    mongoose.Promise = global.Promise;

    indexModel(Band);
    indexModel(Album);
    indexModel(Member);
}

function indexModel(model) {
    var stream = model.synchronize();
    var count = 0;

    log('indexing database...');

    stream.on('data', function(err, doc) {
        count++;
    });
    stream.on('close', function() {
        log('indexed ' + count + ' documents!');
    });
    stream.on('error', function(err) {
        log(err);
    });
}

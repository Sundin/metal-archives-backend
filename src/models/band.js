'use strict';

const mongoosastic = require('mongoosastic');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const AlbumSchema = require('./album').schema;
const MemberSchema = require('./member').schema;

const BandSchema = new Schema({
    band_name: {
        type: String,
        required: true,
        es_type: 'text',
        es_fields: {
            raw: { type: 'keyword' }
        },
        es_indexed: true
    },
    _id: {
        type: String
    },
    country: {
        type: String,
        es_indexed: true
    },
    genre: {
        type: String,
        es_indexed: true
    },
    location: String,
    status: {
        type: String,
        es_indexed: true
    },
    formed_in: String,
    themes: String,
    label: {
        _id: String,
        name: String,
        url: String
    },
    years_active: String,
    url: String,
    photo_url: String,
    logo_url: String,
    biography: String,
    members: {
        current: [ MemberSchema],
        past: [ MemberSchema ],
        live: [ MemberSchema ]
    },
    discography: [ {
        type: AlbumSchema,
        default: []
    } ], links: [ {
        title: String,
        url: String
    } ],
    similar: [ {
        name: String,
        _id: String,
        country: String,
        genre: String,
        score: String
    } ],
    last_crawl_timestamp: { type: Date }
});

BandSchema.plugin(mongoosastic, {
    host: 'ori-eu-west-1.searchly.com',
    auth: 'paas:39f011cfa7ff78463dfbcb5868d5e490',
    port: 80
});

const Band = mongoose.model('Band', BandSchema);

// Band.createMapping({}, function(err, mapping) {
//     if (err) {
//       console.log('error creating mapping (you can safely ignore this)');
//       console.log(err);
//     } else {
//       console.log('mapping created!');
//       console.log(mapping);
//     }
// });

module.exports = Band;
module.exports.Schema = BandSchema;

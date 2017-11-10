'use strict';

const mongoosastic = require('mongoosastic');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const MemberSchema = require('./member').schema;

const AlbumSchema = new Schema({ 
    title: {
        type: String,
        required: true,
        es_type: "text",
        es_fields: {
          raw: { type: "keyword" }
        }
    },
    _id: { 
        type: String,
        unique: true
    },
    year: String,
    type: String,
    url: String,
    reviews: String,
    bands: [ {
        _id: String,
        name: String
    } ],
    release_date: String,
    catalog_id: String,
    label: {
        _id: String,
        name: String
    },
    format: String,
    limitation: String,
    songs: [ {
        title: String,
        length: String
    } ],
    cover_url: String,
    lineup: [ MemberSchema ]
});

AlbumSchema.plugin(mongoosastic);

const Album = mongoose.model('Album', AlbumSchema);

Album.createMapping({}, function(err, mapping){  
    if (err) {
      console.log('error creating mapping (you can safely ignore this)');
      console.log(err);
    } else {
      console.log('mapping created!');
      console.log(mapping);
    }
});

module.exports = Album;
module.exports.schema = AlbumSchema;
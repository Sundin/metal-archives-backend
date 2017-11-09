'use strict';

const mongoosastic = require('mongoosastic');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const AlbumSchema = new Schema({ 
    title: {
        type: String,
        required: false, //TODO: should be true
        es_type: "text",
        es_fields: {
          raw: { type: "keyword" }
        }
    },
    _id: { 
        type: String,
        unique: true,
        required: true
    },
    year: { 
        type: String
    },
    type: { 
        type: String
    },
    url: {
        type: String
    },
    reviews: String
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
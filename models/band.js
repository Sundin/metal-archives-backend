'use strict';

const mongoosastic = require('mongoosastic');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const BandSchema = new Schema({ 
    band_name: {
        type: String,
        required: true,
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
    country: { 
        type: String
    },
    genre: { 
        type: String
    }
});

BandSchema.plugin(mongoosastic);

const Band = mongoose.model('Band', BandSchema);

Band.createMapping({}, function(err, mapping){  
    if (err) {
      console.log('error creating mapping (you can safely ignore this)');
      console.log(err);
    } else {
      console.log('mapping created!');
      console.log(mapping);
    }
});

module.exports.band = Band;

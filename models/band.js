'use strict';

const mongoosastic = require('mongoosastic');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const AlbumSchema= require('./album').schema;

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
    },
    location: { 
        type: String
    },
    status: { 
        type: String
    },
    formed_in: { 
        type: String
    },
    themes: { 
        type: String
    },
    label: { 
        _id: String,
        name: String
    },
    years_active: { 
        type: String
    },
    url: { 
        type: String
    },
    photo_url: { 
        type: String
    },
    logo_url: { 
        type: String
    },
    biography: { 
        type: String
    },
    members: [Object],
    discography: [ AlbumSchema ],
    links: [String],
    similar: [String],
    lastCrawlTimestamp: { type: Date },
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

module.exports = Band;

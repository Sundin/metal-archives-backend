'use strict';

const mongoosastic = require('mongoosastic');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const MemberSchema = new Schema({ 
    name: {
        type: String,
        required: true
    },
    _id: { 
        type: String
    },
    url: String,
    instrument: String,
    see_also: [ {
        band_name: String,
        _id: String,
        still_member: Boolean
    } ]
});

MemberSchema.plugin(mongoosastic);

const Member = mongoose.model('Member', MemberSchema);

Member.createMapping({}, function(err, mapping){  
    if (err) {
      console.log('error creating mapping (you can safely ignore this)');
      console.log(err);
    } else {
      console.log('mapping created!');
      console.log(mapping);
    }
});

module.exports = Member;
module.exports.schema = MemberSchema;
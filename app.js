const express = require('express');
const app = express();
const mongoose = require('mongoose');
const mongoosastic = require('mongoosastic');
mongoose.connect('mongodb://localhost/test', { useMongoClient: true });
mongoose.Promise = global.Promise;
const Schema = mongoose.Schema;

const elasticsearch = require('elasticsearch');
const client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'trace'
});

client.ping({
    // ping usually has a 3000ms timeout
    requestTimeout: 1000
  }, function (error) {
    if (error) {
      console.trace('elasticsearch cluster is down!');
      console.log(error);
    } else {
      console.log('All is well');
    }
  });

app.listen(3001, () => {
    console.log('Example app listening on port 3001!');
});

const BandSchema = new Schema({ 
    band_name: {
        type: String,
        required: true,
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
    if(err){
      console.log('error creating mapping (you can safely ignore this)');
      console.log(err);
    }else{
      console.log('mapping created!');
      console.log(mapping);
    }
});

var stream = Band.synchronize()
var count = 0;

stream.on('data', function(err, doc){
  count++;
});
stream.on('close', function(){
  console.log('indexed ' + count + ' documents!');
});
stream.on('error', function(err){
  console.log(err);
});


/* ENDPOINTS */

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/band/:id', (req, res) => {
    const id = req.params.id;
    Band.find({_id: id}, (error, result) => {
        if (error) {
            console.log(error);
            res.status(500).send(error);
        } 
        res.send(result);
    });
});

app.get('/search/band_name/:query', (req, res) => {
    const query = req.params.query;
    Band.search({
        fuzzy: {
            band_name: query
        }
    }, function(error,results) {
        if (error) {
            console.log(error);
        }
        console.log(results);
        res.send(results);
    });
});

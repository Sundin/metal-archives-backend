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
    requestTimeout: 3000
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
    if(err){
      console.log('error creating mapping (you can safely ignore this)');
      console.log(err);
    }else{
      console.log('mapping created!');
      console.log(mapping);
    }
});

//indexDatabase();

function indexDatabase() {
    var stream = Band.synchronize()
    var count = 0;

    console.log('indexing database...');
    
    stream.on('data', function(err, doc){
      count++;
    });
    stream.on('close', function(){
      console.log('indexed ' + count + ' documents!');
    });
    stream.on('error', function(err){
      console.log(err);
    });
}

/* ENDPOINTS */

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/band/:band_name/:id', (req, res) => {
    const band_name = req.params.band_name;
    const id = req.params.id;

    if (!id || !band_name) {
        return res.status(400).send('Incomplete query');
    }

    Band.find({_id: id}, (error, result) => {
        if (error) {
            console.log(error);
            res.status(500).send(error);
        }
        const band = result[0];
        if (!band || !band.lastCrawlTimestamp) {
            // TODO: set timestamp when fetching from M.A. Also make a new fetch if timestamp is too old (>1 month?)
            console.log('Need the fetch band data from Metal Archives')
        }
        res.send(band);
    });
});

app.get('/album/:album_id', (req, res) => {
    const album_id = req.params.query;
    
        if (!album_id) {
            return res.status(400).send('Incomplete query');
        }

    //TODO: return album

    //Note: maybe /album/:band/:title/:id
});

app.get('/search/:query', (req, res) => {
    const query = req.params.query;

    if (!query) {
        return res.status(400).send('Incomplete query');
    }

    console.log('searching for:', query);
    Band.search({
        match: {
            band_name: {
                query: query,
                fuzziness: auto
            }
        }
    }, function(error,results) {
        if (error) {
            console.log(error);
        }
        console.log(results);
        res.send(results);
    });
});

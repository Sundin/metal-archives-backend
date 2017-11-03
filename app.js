const express = require('express');
const app = express();
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/test', { useMongoClient: true });
mongoose.Promise = global.Promise;

app.listen(3001, () => {
    console.log('Example app listening on port 3001!');
});

const Band = mongoose.model('Band', { 
    band_name: String, 
    _id: String,
    country: String,
    genre: String
});

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

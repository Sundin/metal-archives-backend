# metal-archives-backend
Backend for the Metal Archives

## Installation

Requires MongoDB and ElasticSearch.

Then run `npm install`.

### MongoDB

Install MongoDB.

Create a folder named `data`.

### ElasticSearch

`brew install elasticsearch` (requires Ruby >2.3)

## Starting the server 

`mongod --dbpath data` (make sure the data directory exists)

`elasticsearch`

`npm start`

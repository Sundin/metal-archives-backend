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

## Running a lambda locally
Copy the example launch configuration files from `documentation/launchConfig` and put into your `.vscode` folder. You can now trigger the lambdas locally through the Debug tab of VS Code.

## Environment variables
At the moment you need to modify four different files if you want to add an environment variable: `serverless.yaml`, `.env` (for running locally), `deploy/production.env` and `deploy/environmentVariables.js`.

## Deploying the Lambdas

`npm run deploy`

## Linting
Use `npm run lint` to run ESLint and automatically fix lint warnings where possible.

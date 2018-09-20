#!/bin/bash

# TODO: get from environment file
export AWS_PROFILE="kicksort"

echo "Deploying to production..."

# TODO: write environment variables from .env file to serverless.yaml 

node_modules/serverless/bin/serverless deploy --stage "production"

echo "Finished"

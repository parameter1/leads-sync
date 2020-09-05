#!/bin/bash

rm deployment.zip
rm -rf node_modules
NODE_ENV=production npm i
zip -r deployment.zip .

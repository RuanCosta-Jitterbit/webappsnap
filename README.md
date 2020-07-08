# Screen capture for PMM

Connects to a PMM server, loads pages and takes a screen shot, saving the image as JPG or PNG.

Uses Puppeteer to run Chrome.

## Usage

./run.sh

## Configuration

There are three areas for configuration:

defaults.json Sets default values

config.json Defines each PMM dashboard to be snapped

Environment variables Set in run.sh or in your environment. Values override the equivalents in defaults.json

## config.json

Defines the server and dashboards for a single PMM server instance.


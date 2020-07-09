# Screen capture for PMM

Connects to a PMM server, loads pages and takes a screen shot, saving the image as JPG or PNG.

Uses Puppeteer to run Chrome.

## Prerequisites

- [Puppeteer](https://github.com/puppeteer/puppeteer)

   `npm i puppeteer`

## Usage

./run.sh

## Configuration

There are three areas for configuration:

defaults.json Sets default values

config.json Defines a PMM server and the dashboards to be snapped 

Environment variables Set in run.sh or in your environment. Values override the equivalents in defaults.json

## config.json

Defines the server and dashboards for a single PMM server instance.

Fields:

name: Name for the instance
server: Base URL for the instance
version: Version of PMM to which this config applies
wait: Default page wait time in milliseconds
dashboards: Array of:
  desc: Description. Short text used as image filenam
  path: additional path to dashboard (Full Url is server + path + options)
options: An array of URL parameters



git clone https://github.com/percona/grafana-dashboards.git
git fetch --all --tags --prune
git tag # List tags to choose one
git checkout TAG
cd dashboards
for i in *.json; do echo "{"; grep -B 1 -h \"uid\" $i | sed '/uid/s/,$//'; echo "},"; done > pmm-TAG-dashboards.json

Insert into config-*.json as dashboards element
Change "version" to match TAG

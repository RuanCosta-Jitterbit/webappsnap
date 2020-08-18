# Screen capture for PMM

- Connects to a PMM server, loads dashboards and takes screen shots of whole screens or portions (HTML elements), saving the images as JPG or PNG.
- Uses Puppeteer to run a headless Chromium web browser.

## Prerequisites

- [Puppeteer (browser control)](https://github.com/puppeteer/puppeteer)
- [Yargs (CLI arg processing)](https://github.com/yargs/yargs)

   ```
   npm i puppeteer yarg
   ```

## Usage

To snap the default [pmmdemo](https://pmmdemo.percona.com/) instance:

```
./run.sh
```

## Configuration Files

- `cfg/defaults.json` - Sets default values (can be overridden by environment variables).
- `cfg/dashboards.json` - Details of each dashboard or HTML element to be snapped.
- `cfg/config-*.json` - The PMM server details

Environment variables set in your environment or in `run.sh` override the values in `cfg/defaults.json`.

### `defaults.json`

Values in this file are the default settings if none are setting as environment variables in the execution envionment or in `run.sh`.

- `config_file`: Path to the server configuration file.
- `jpg_quality`: For JPG images, the quality setting. Lower values are useful for documentation pages with many full-screen snaps. Values of 50 or above produce acceptable results for web and print copy.
- `img_pfx`: File name prefix for each snap file.
- `img_ext`: File name extension, either `.png` or `.jpg`.
- `img_dir`: Where to save images. Within this subdirectories are created as `server/resolution/scale`.
- `user`: PMM Server login name.
- `pass`: PMM Server login password.
- `headless`: When `true`, Puppeteer uses a headless (invisible) web browser. If `false`, the web browser is made visible. Useful for debugging (or simply entertainment).
- `img_width`: The image width, in pixels, for full screen snaps.
- `img_height`: The image height, in pixels, for full screen snaps.
- `img_scale`: The image scaling factor.
- `login_user_elem`: The CSS selector ID for the PMM login screen user input text field.
- `login_pass_elem`: The CSS selector ID for the PMM login screen password input text field.
- `login_skip_elem`: The CSS selector ID for the password change 'Skip' button (seen after first logging in).
- `cookie_popup_elem`: The CSS selector ID for the Percona 'Accept cookies' dialogue (which is removed before snapping).


### config.json

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

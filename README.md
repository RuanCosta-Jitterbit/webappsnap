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

To snap all dashboards in the default [pmmdemo](https://pmmdemo.percona.com/) instance:

```
./run.sh
```

To snap specific dashboards, list their UIDs:

```
./run.sh --dash=pmm-home,node-memory,mysql-instance-overview
```

To get a list of available dashboard UIDs:

```
./run.sh --list
```


## Configuration Files

- [cfg/defaults.json](#defaults-json) - Default values (can be overridden by environment variables).
- [cfg/config-*.json](#config-json) - PMM server IP, name and wait times.
- [cfg/dashboards.json](#dashboards-json) - Details of each dashboard's URL and element IDs.

Environment variables set in your environment or in `run.sh` override the values in `cfg/defaults.json`.

### defaults.json

Values in this file are the default settings if no environment variables are set or command line arguments provided to `run.sh`.

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


### config-*.json

Defines a PMM server instance.

Fields:

`name`
: Name identifying the instance. (Used in the image save path.)

`server`
: Base URL for the instance (`https://<IP or server>`).

`stem`
: URL path extension for PMM dashboards. (Default `"d/"`)

`wait`
: Default pre-page load wait time in milliseconds. For slow networks or instances, increase this time but be prepared for a complete set of snaps (with `--full`) to take around an hour.

`pause`
: A short wait time in milliseconds, to allow the UI to settle before snapping.


git clone https://github.com/percona/grafana-dashboards.git
git fetch --all --tags --prune
git tag # List tags to choose one
git checkout TAG
cd dashboards
for i in *.json; do echo "{"; grep -B 1 -h \"uid\" $i | sed '/uid/s/,$//'; echo "},"; done > pmm-TAG-dashboards.json

Insert into config-*.json as dashboards element
Change "version" to match TAG

### dashboards.json

Snaps are made in the order of this file's entries.

# PMM Dashboard Screenshots

- Connects to a PMM server, loads dashboards and takes screen shots of whole screens or portions (HTML elements), saving the images as JPG or PNG.
- Uses Puppeteer to run a headless Chromium web browser.
- Works on PMM1 and PMM2.
- What to snap (whole dashboards, panels, buttons, menus, etc.) are defined in a JSON file.

## Prerequisites

- [Puppeteer (browser control)](https://github.com/puppeteer/puppeteer)
- [Yargs (CLI arg processing)](https://github.com/yargs/yargs)

   ```
   npm i puppeteer yarg
   ```

## Quick Start

Snap all dashboards in the default [PMM2 demo instance](https://pmmdemo.percona.com/) instance:

```
./run.sh
```

Snap specific dashboards with the `--uid` option to specify their UIDs as a comma-separated list:

```
./run.sh --uid=pmm-home,node-memory,mysql-instance-overview
```

List available dashboard UIDs:

```
./run.sh --list
```

## Usage

Snapping the dashboards of a PMM instance.

1. Create a new JSON file `./cfg/server-<my pmm instance>.json`. (Copy `server-local.json` or `server-test.json`)

2. Set the fields:
   - `"name"`: A free-form name for your instance. (Snapped images will be saved in a subdirectory with this name.)
   - `"server"`: The HTTPS server IP or hostname.
   - `"graph"`: For PMM2 instances, the word `"graph"`. For PMM1, an empty value (`""`)
   - `"wait"`: The number of milliseconds to wait for a page to load. (10000 to 20000 for local instances, 30000 or more for remote instances.)

   (`"stem"` is always `"d"`. `"pause"` is a shorter wait interval used when snapping mouse-over tooltips.)

3. Set environment variables. You can either set them in `run.sh` or in your environment:

   Mandatory:

   - `SNAP_USER`: The username for the instance. Default: `admin`
   - `SNAP_PASS`: The password for this username. Default: `admin`
   - `SNAP_SRV_CFG_FILE`: The path to your newly-created server configuration file (created in step 1).
   - `SNAP_DASHBOARDS_FILE`: This does not need to be changed for PMM2 instances. For PMM1, set the value to `./cfg/dashboards-pmm1.json`.
   - `SNAP_DEFAULTS_FILE`: The default (`./cfg/defaults.json`) works for PMM2 instances. For PMM1, set the value to `./cfg/defaults-1.17.4.json`.

   Optional:

   - `SNAP_IMG_WIDTH`: The snap image width (in pixels). Default: 1280
   - `SNAP_IMG_HEIGHT`: The snap image height (in pixels). Default: 720
   - `SNAP_IMG_SCALE`: Images can be scaled to reduce their size (for JPG formats). Default: 1
   - `SNAP_JPG_QUALITY`: For JPG format, the image quality (a percent value) also helps reduce file size. Default: 100
   - `SNAP_IMG_EXT`: Set to `.png` for PNG format images. Default: `.jpg`
   - `SNAP_IMG_SEQ`: Set to `true` to prefix image filenames with a sequence number. Useful for testing and identifying images. Default: `false`
   - `SNAP_IMG_PFX`: After the optional sequence number, a secondary prefix is added to the filename. Default: `PMM`
   - `SNAP_IMG_DIR`: Where to save images. Default: `./images`. This is the base directory within which two additional subdirectories are created: `<name>/SNAP_IMG_WIDTHxSNAP_IMG_HEIGHTxSNAP_IMG_SCALE`. E.g `./images/myserver/1920x1080x1/`
   - `SNAP_LOG_IN`: Set to true to snap the login page, log in, and click the 'skip password change' button. Default: true.

4. Run the wrapper script:

   ```
   ./run.sh
   ```

Optional arguments:

`--debug`
: Show values used.

`--full`
: Also snap the full dashboard beyond the specified viewport (`SNAP_IMG_WIDTH` x `SNAP_IMG_HEIGHT`).

## How it works

Puppeteer is a Node.js framework for remotely controlling a web browser.

It is used to load PMM dashboards one by one and take screenshots of the entire window
and of selected elements.

There are three Node.js files and three configuration files.

### Node.js Files

**snap-pmm-dashboards.js**

The 'main' file. After an initial login section, this script loops through the entries in `dashboards.json` each of which specifies a PMM dashboard and, optionally, elements to click (menus, buttons), hover over (tooltips) and snap (individual elements such as buttons, menus or panels).

**util.js**

Functions for common operations, the most important of which are:

`snap()`
: Given a Puppeteer `page` (which may be a page or an element), snap title, save directory and optional element bounding box, snaps the item and saves the image with [`page.screenshot()`](https://github.com/puppeteer/puppeteer/blob/v4.0.0/docs/api.md#pagescreenshotoptions).

`load()`
: Loads a URL (with [`page.goto()`](https://github.com/puppeteer/puppeteer/blob/v4.0.0/docs/api.md#pagegotourl-options)) and waits for it

A brief description of other functions:

- `mkdir()`: Creates the image save directories.
- `pad()`: Zero-pads the three-digit numerical prefix sequence number (when `SNAP_IMG_SEQ=true`).
- `login()`: Handles the special case of the main login page.
- `eat()`: Removes a 'accept cookies' dialogue that occasionally appears on the [PMM Demo](https://pmmdemo.percona.com/) site.

**config.js**

Loads and provides a common access to dashboard and defaults configuration files.

### Configuration Files

**Default values: `defaults.json`**

- `defaults.json` - For PMM 2.9.1
- `defaults-2.10.0.json` - For PMM 2.10.0 (Grafana 7)
- `defaults-1.17.4.json` - For PMM 1.17.4

Values in this file are the default settings if no environment variables are set or command line arguments provided to `run.sh`. Values in here are specific to the version of PMM. The values are:

`version`
: Version of PMM for which these defaults apply (i.e. have been tested).

`config_file`
: Path to the server configuration file.

`jpg_quality`
: For JPG images, the quality setting. Lower values are useful for documentation pages with many full-screen snaps. Values of 50 or above produce acceptable results for web and print copy.

`img_pfx`
: File name prefix for each snap file.

`img_ext`
: File name extension, either `.png` or `.jpg`.

`img_dir`
: Where to save images.

`user`
: PMM Server login name.

`pass`
: PMM Server login password.

`headless`
: When `true`, Puppeteer uses a headless (invisible) web browser. If `false`, the web browser is made visible. Useful for debugging (or simply entertainment).

`img_width`
: The image width, in pixels, for full screen snaps.

`img_height`
: The image height, in pixels, for full screen snaps.

`img_scale`
: The image scaling factor.

`login_user_elem`
: The CSS selector ID for the PMM login screen user input text field.

`login_pass_elem`
: The CSS selector ID for the PMM login screen password input text field.

`login_skip_elem`
: The CSS selector ID for the password change 'Skip' button (seen after first logging in).

`cookie_popup_elem`
: The CSS selector ID for the Percona 'Accept cookies' dialogue (which is removed before snapping).

`container`
: The CSS selector ID for the dashboard body, exluding left and top menu bars. This is used by the `--full` option to snap the entire dashboard beyond the specified viewport. (Puppeteer's `fullPage` option to `screenshot()` has no effect, possibly because of how the PMM interface's left-most menu bar defines the extent of the full viewport.)

**Server configuration: `server-*.json`**

- `config-local.json` - For localhost instances.
- `config-test.json` - Test or template configuration file.
- `config-pmmdemo.json` - For <https://pmmdemo.percona.com> (PMM2)
- `config-pmm2stage.json` - For <https://pmm2stage.percona.com> (PMM2)
- `config-pmmstage.json` - For <https://pmmstage.percona.com> (PMM1)

Defines PMM server instances: their URLs and default page load time.

Fields:

`name`
: Name identifying the instance. (Used in the image save path.)

`server`
: Base URL for the instance (`https://<IP or server name>`).

`graph`
: Keyword used in dashboard URLs for PMM2. (Default for PMM2: `"graph"`. Empty for PMM1.)

`stem`
: URL path extension for PMM dashboards. (Default `"d"`)

`wait`
: Default pre-page load wait time in milliseconds. For slow networks or instances, increase this time but be prepared for a complete set of snaps (with `--full`) to take around an hour.

`pause`
: A short wait time in milliseconds, to allow the UI to settle before snapping items such as drop-down menus and mouse-over tooltips.

**Dashboard definitions: `dashboards.json`**

- `dashboards.json` - For PMM2 (2.10.0)
- `dashboards-pmm1.json` - For PMM1 (1.17.4)

The bulk of configuration is in these files. They list each dashboard's UID (part of the URL), what items to click before snapping, which element to move to before snapping, and which specific elements to snap individually (e.g various UI devices or panels).

*Snaps occur in the order listed in this file.*

Fields:

`versions`
: List of PMM versions for which this configuration works. (Not currently used.)

`dashboards`
: Array of items, each representing a dashboard with optional items.

   `title`
   : The name of the dashboard. This becomes part of the image filename.

   `uid`
   : The dashboard's UID. (The part of the URL after `https://<server>/d/graph/` for PMM2, `https://<server>/d` for PMM1).

   `url`
   : Grafana dashboards are served from `/graph/d/<uid>`. Two exceptions are the Swagger API page (`/swagger/`) and the login page (`/graph/login`). Using `url=<url>` overrides the default dashboard path.

   `wait`
   : Override the default page load wait time in the server `config-*.json` file. The value is in milliseconds.

   `options`
   : An array of URL option strings appended to the dashboard load URL. Used to snap dashboards with a specific service name, node name, or any dashboard where URL options are used to select pages, e.g. Query Analytics details tabs.

   `operations`
   : A list of tasks, each task being a name and a list of steps. Dashboard entries without operations are snapped automatically. If `operations` is present, dashboards and dashboard elements must be explicitly snapped using a `"type": "snap"` element within a `"step"` element. Operations are used where a sequence of actions is needed to show menus, perform tasks such as selecting and deleting items for `pmm-inventory`, showing tooltips on `pmm-qan` elements, or snap specific GUI elements and panels in `pmm-home`. The most complex application is in `pmm-settings` where a dummy Percona Platform account is created and logged into.

      `name`
      : A name for this operation (group of steps).

      `steps`
      : An array of individual steps.

         `name`
         : Name for this step.

         `type`
         : Type of step. One of:

            `click`
            : Click the element specified by `selector`.

            `move`
            : Move to (hover over) the element specified by `selector`. (Uses [`page.hover()`](https://github.com/puppeteer/puppeteer/blob/v4.0.0/docs/api.md#pagehoverselector) which finds the first CSS selector ID and positions the mouse in the center of it.)

            `text`
            : Type text (from `value`) into the element specified by `selector`.

            `value`
            : Text for `text` type.

            `snap`
            : Screenshot the window. If a `selector` is given, screenshot only it.

         `selector`
         : The CSS selector for the clickable item.

         `viewport`
         : Each step can specify its own viewport which overrides either the outer dashboard or default viewport.

            `width`, `height`
            : Width and height (in pixels) for this step's viewport (if snapped).

Some entries have a `comment` field. This is ignored, as are any other fields not mentioned above.

## Create a new `dashboards.json` file

The core of a dashboards configuration file is the title and UID for each.
These can be extracted from the `grafana-dashboards` repository as follows.

```
git clone https://github.com/percona/grafana-dashboards.git
git fetch --all --tags --prune
# List PMM version tags
git tag
# Set the tag for the PMM version
TAG=2.9.1
git checkout $TAG
cd dashboards
for i in *.json; do echo "{"; grep -B 1 -h \"uid\" $i | sed '/uid/s/,$//'; echo "},"; done > dashboards-$TAG.json
```

## Problems and Troubleshooting

This tool was made to make documentation easier. However, the code needs constant nurturing and updating. With every change to PMM, something usually changes.

- CSS selectors in PMM have not been created consistently and often change.
- Some UI interactions are difficult to automate, especially where the text (e.g. an account name or password) can't be hard-coded.

### Changed CSS selectors

Use your browser's developer's mode to inspect the element causing trouble. Check that the CSS selector matches that specified. This tool uses CSS selectors but xpaths also work.

### Time-outs or blank snaps

Some pages take longer to load than others. Panels in some snaps will show they are still loading, or portions will be blank. For these, extend the loading time with the per-dashboard wait value.

### Page load wait time

This tool strives for flexibility over speed, allowing each dashboard snap to be resized for PMM documentation, and allowing for partial snaps illustrating particular features or emphasising specific panels. This means the window size (viewport) has to be reset for every snap. In Puppeteer, that means you must reload the page and wait for it after each viewport change. Consequently, snapping all dashboards takes around an hour with default settings.

There are two ways to shorten the time spent using this tool.

1. Reduce the default page wait time. This can speed things up but some dashboards won't finish loading before the snap is taken.

2. Use the `--uid` option to snap specific dashboards.

3. Don't use the `--full` option. This works by setting the viewport to 10 times the default height, reloading the page, waiting, snapping the container element, resetting the viewport and again reloading the page and waiting.

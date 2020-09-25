# PMM Dashboard Screenshots

[Percona Monitoring and Management (PMM)](https://www.percona.com/software/database-tools/percona-monitoring-and-management) is free, open-source database monitoring software.

This repository is a tool to automate PMM screenshot capture.

- It connects to a PMM server, loading specified dashboards, taking screen shots of whole screens or portions (HTML elements), saving the images as JPG or PNG. It works on PMM1 and PMM2.

- It uses Puppeteer to run a headless Chromium web browser. A JSON file defines what to snap (whole dashboards, panels, buttons, menus, etc.), and any preliminary tasks (*operations* and *steps*) needed to set up the screenshot (open a menu, enter text, etc.).

## Install (Prerequirements)

- [Node.js](https://nodejs.org/en/download/)
- [Puppeteer](https://github.com/puppeteer/puppeteer)
- [Yargs](https://github.com/yargs/yargs)

## Quick Start

1. Clone this repository.

2. Snap dashboards in the [PMM2 demo instance](https://pmmdemo.percona.com/):

    ```
    cd pmm-screenshots
    # Snap ALL dashboards
    ./run.sh
    # Snap specific dashboards
    ./run.sh --uid=pmm-home,node-memory,mysql-instance-overview
    # Show available dashboard UIDs
    ./run.sh --list
    ```

## Usage

To create PMM dashboards screenshots for your own PMM instance:

1. Create a new JSON file `./cfg/server-<my pmm instance>.json`. (Copy `server-local.json` or `server-test.json`)

2. Edit this new file and set values for the fields:

   - `"name"`: A free-form name for your instance. (Snapped images will be saved in a subdirectory with this name.)
   - `"server"`: The HTTPS server IP or hostname.
   - `"graph"`: For PMM2 instances, the word `"graph"`. For PMM1, an empty value (`""`)
   - `"wait"`: The number of milliseconds to wait for a page to load. (10000 to 20000 for local instances, 30000 or more for remote instances.)

   These fields are configurable but don't need changing:

   - `"stem"` is `"d"` for both PMM1 and PMM2.
   - `"pause"` is a shorter wait interval used when snapping mouse-over tooltips. 1000-5000ms is enough.

3. Set values for environment variables (in your shell, or in `run.sh` where examples and explanations are given).

   - `SNAP_SRV_CFG_FILE`: The path to your newly-created server configuration file (created in step 1).

   If your PMM instance uses a non-default login, you should also set:

   - `SNAP_USER`: The Grafana username for the instance.

   - `SNAP_PASS`: The Grafana password for this user.


   If your instance is PMM version 1, you must set:

   - `SNAP_DASHBOARDS_FILE`: Set the value to `./cfg/dashboards-pmm1.json`. (The default is `./cfg/dashboards-pmm2.json`).

   - `SNAP_DEFAULTS_FILE`: The default (`./cfg/defaults.json`) works for PMM2 instances. For PMM1, set the value to `./cfg/defaults-1.17.4.json`.

   Optional:

   - `SNAP_IMG_WIDTH`: The snap image width (in pixels). Default: 1280
   - `SNAP_IMG_HEIGHT`: The snap image height (in pixels). Default: 720
   - `SNAP_IMG_SCALE`: Images can be scaled up or down by this factor. Default: 1
   - `SNAP_JPG_QUALITY`: For JPG format, the image quality (a percent value) can help reduce file size. Default: 100
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

`main.js` loops through entries in the defined dashboards configuration file (default `./cfg/dashboards-pmm2.json`), processing each dashboard, its operations and steps, one by one.

The basic structure of a dashboards configuration file is:

```
One or more dashboards
  Zero or more operations
    One or more steps
```

- A dashboard can be specified more than once. This is useful if the same dashboard needs to be snapped with a different sized browser window, or there are individual components (e.g. menus, buttons, specific panels) to be snapped separately as well as the whole window.

- You can specify one or more operations to define what should happen prior to a snap. For example, you can hover over something to reveal a tooltip, select an item in a list, enter text into a field, or go through the step-by-step process of adding, editing and deleting something (as done for the PMM inventory entry). You can snap the whole window or an HTML element as specified by its CSS selector.

- An operation is a group of steps. Except for 'wait', a selector specifies the CSS selector to move to, click on, enter text into, blur (to obscure it), or snap. A step's type is one of:

  - `move`: move to (hover over) a selector;
  - `text`: enter text into the selector;
  - `click`: click the selector;
  - `blur`: blur (make fuzzy) the element specified by selector;
  - `wait`: explicitly wait for the specified period (in ms);
  - `snap`: Explicitly snap the the specified selector or the whole viewport.

- If no operations are specified, a dashboard entry causes a single full-window snap. If operations are specified, you must explicitly snap the window or its elements (using the `selector` field).

See also [Dashboard definitions](#dashboard-definitions-dashboardsjson).

### Program Files

There are three Node.js files and three configuration files.

#### main.js

The core of `main.js` loops through the dashboards file, processing each dashboard entry, and looping through its operations and steps.

#### util.js

Functions for common operations, the most important of which are:

`snap(page, title, dir, boundingBox)`
: `page` = a page or an element;
`title` = the filename title (before prefixing and character replacement);
`dir` = the save directory;
`boundingBox` = optional viewport to snap.

`load(page, url, wait)`
: Loads `url` into browser's `page` and waits `wait` milliseconds.

A brief description of other functions:

- `mkdir()`: Creates the image save directories.
- `login()`: Handles the special case of the main login page.
- `eat()`: Removes an 'accept cookies' pop-up dialogue that occasionally appears on the [PMM Demo](https://pmmdemo.percona.com/) site.

#### config.js

Loads and provides a common access to dashboard and defaults configuration files.

### Configuration Files

#### Default values: `defaults.json`

- `defaults.json` - For PMM 2.10 (Grafana 7)
- `defaults-2.9.1.json` - For PMM 2.9.1
- `defaults-1.17.4.json` - For PMM 1.17.4

Values in this file are the default settings if no environment variables are set or command line arguments provided to `run.sh`. Below are the available fields and corresponding environment variables and command-line options, where appropriate.

`version`
: Version of PMM for which these defaults apply (i.e. have been tested).

`config_file`
: Path to default server configuration file. (`SNAP_SRV_CFG_FILE`)

`dashboards_file`
: Path to default dashboards configuration file. (`SNAP_DASHBOARDS_FILE`)

`user`
: PMM Server login name. (`SNAP_USER`)

`pass`
: PMM Server login password. (`SNAP_PASS`)

`img_dir`
: Where to save images. (`SNAP_IMG_DIR`)

`img_seq`
: Whether to add a primary file name prefix as a zero-padded 3-digit sequence number. (`SNAP_IMG_SEQ`)

`img_pfx`
: The secondary file name prefix for each snap file. (`SNAP_IMG_PFX`)

`img_ext`
: File name extension, either `.png` or `.jpg`. (`SNAP_IMG_EXT`)

`img_width`
: The image width, in pixels, for full screen snaps. (`SNAP_IMG_WIDTH`)

`img_height`
: The image height, in pixels, for full screen snaps. (`SNAP_IMG_HEIGHT`)

`img_scale`
: The image scaling factor. (`SNAP_IMG_SCALE`)

`jpg_quality`
: For JPG images, the quality setting. Lower values are useful for documentation pages with many full-screen snaps. Values of 50 or above produce acceptable results for web and print copy. (`SNAP_JPG_QUALITY`)

`log_in`
: Whether to attempt logging in using `user` and `pass` values. (`SNAP_LOG_IN`)

`headless`
: When `true`, Puppeteer uses a headless (invisible) web browser. If `false`, the web browser is made visible. Useful for debugging (or simply entertainment). (`SNAP_HEADLESS`)

`debug`
: When `true`, program prints operating parameters. (`--debug`)

`login_user_elem`
: The CSS selector ID for the PMM login screen user input text field.

`login_pass_elem`
: The CSS selector ID for the PMM login screen password input text field.

`login_skip_elem`
: The CSS selector ID for the password change 'Skip' button (seen after first logging in).

`cookie_popup_elem`
: The CSS selector ID for the Percona 'Accept cookies' dialogue (which is removed before snapping).

`container`
: The CSS selector ID for the dashboard body, excluding left and top menu bars. This is used by the `--full` option to snap the entire dashboard beyond the specified viewport. (Puppeteer's `fullPage` option to `screenshot()` has no effect, possibly because of how the PMM interface's left-most menu bar defines the extent of the full viewport.)

#### Server configuration: `server-*.json`

- `server-pmmdemo.json` - For <https://pmmdemo.percona.com> (PMM2)
- `server-pmm2stage.json` - For <https://pmm2stage.percona.com> (PMM2)
- `server-pmmstage.json` - For <https://pmmstage.percona.com> (PMM1)
- `server-local.json` - For localhost instances.
- `server-test.json` - Test or template configuration file.

Defines PMM server instances: their URLs and default page load time.

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

#### Dashboard definitions: `dashboards.json`

- `dashboards-pmm2.json` - For PMM2 (2.10.0)
- `dashboards-pmm1.json` - For PMM1 (1.17.4)

The bulk of configuration is in these files. They list each dashboard's UID (part of the URL), what items to click before snapping, which operations and steps to perform, and which specific elements to snap individually (e.g various UI devices or panels).

*Snaps occur in the order listed in this file.*

`versions`
: List of PMM versions for which this configuration works. (Not currently used.)

`dashboards`
: Array of items, each representing a dashboard with optional items.

   `title`
   : The name of the dashboard. This becomes part of the image filename.

   `uid`
   : The dashboard's UID. (The part of the URL after `https://<server>/d/graph/` for PMM2, `https://<server>/d` for PMM1).

   `url` (optional)
   : Grafana dashboards are served from `/graph/d/<uid>`. Two exceptions are the Swagger API page (`/swagger/`) and the login page (`/graph/login`). Using `url=<url>` overrides the default dashboard path.

   `wait` (optional)
   : Override the default page load wait time in the server `config-*.json` file. The value is in milliseconds.

   `options` (optional)
   : An array of URL option strings appended to the dashboard load URL. Used to snap dashboards with a specific service name, node name, or any dashboard where URL options are used to select pages, e.g. Query Analytics details tabs.

   `operations` (optional)
   : A list of tasks, each task being a name and a list of steps. Dashboard entries without operations are snapped automatically. If `operations` is present, dashboards and dashboard elements must be explicitly snapped using a `"type": "snap"` element within a `"step"` element. Operations are used where a sequence of actions is needed to show menus, perform tasks such as selecting and deleting items for `pmm-inventory`, showing tooltips on `pmm-qan` elements, or snap specific GUI elements and panels in `pmm-home`. Examples of operations are in `pmm-qan` and `pmm-settings` dashboards.

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

            `blur`
            : Blur (make illegible) the element specified by `selector`.

            `snap`
            : Screenshot the window. If a `selector` is given, screenshot only it.

         `selector`
         : The CSS selector for the clickable item.

         `viewport`
         : Each step can specify its own viewport which overrides either the outer dashboard or default viewport.

            `width`, `height`
            : Width and height (in pixels) for this step's viewport (if snapped).

Some entries have a `comment` field. This is ignored, as are any other fields not mentioned above.

[How to create a new dashboards configuration file](#how-to-create-a-new-dashboards-configuration-file) explains how a dashboards configuration file is created from scratch.

## Image file names

The image file path is made up of the directory and the filename.

The directory path is a hierarchy constructed in `main.js`. It is made up of:

- Defaults file `img_dir` (or `SNAP_IMG_DIR` if set)
- System path separator (e.g. "/" on Linux).
- Server configuration file `name`
- System path separator.
- Defaults file `img_width` (or `SNAP_IMG_WIDTH` if set)
- "x"
- Defaults file `img_height` (or `SNAP_IMG_HEIGHT` if set)
- "x"
- Defaults file `img_scale` (or `SNAP_IMG_SCALE` if set)
- System path separator.

**Note:** The purpose of a hierarchy is to separate images made with different servers and viewport sizes.

The file name is constructed in `snap()` in `util.js` and is made of each dashboard's entry values (with optional prefixes). Each part is separated with a single underscore ("_").

- (Optional primary prefix) If `img_seq` or `SNAP_IMG_SEQ` is true, a zero-padded integer, incremented for each image.
- (Optional secondary prefix) The value of `img_pfx` or `SNAP_IMG_PFX`
- `dashboards.title`
- (If operations)
  - `dashboards.operations.name`
  - `dashboards.operations.steps.name`
- (If not operations and `--full` option is set) "_full"
- `img_ext` or `SNAP_IMG_EXT` (file extension)


**Note:** Spaces, back slashes (`\`), forward slashes ('/'), and dots (`.`) in titles and names are replaced with underscores (in `util.snap()`).


**Examples**

Dashboard configuration element:

```
{
  "title": "Database Checks",
  "uid": "pmm-checks"
}
```

Image filename (with defaults): `pmm-screenshots/images/pmmdemo/1280x720x1/PMM_Database_Checks.jpg`
Image filename (with defaults and `--full`): `pmm-screenshots/images/pmmdemo/1280x720x1/PMM_Database_Checks_full.jpg`

```
{
  "title": "DBaaS",
  "uid": "pmm-dbaas",
  "operations": [
    {
      "name": "Add New Kubernetes Cluster",
      ...
        {
          "name": "Details Filled",
          "type": "snap"
        },
      ...
```

Image file name: `pmm-screenshots/images/pmmdemo/1280x720x1/PMM_DBaaS_Add_New_Kubernetes_Cluster_Details_Filled.jpg`

(No `_full` image if `--full` option given because this definition uses operations.)

## How to create a new dashboards configuration file

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

### General

- The server URL  (`server` in `server-*.json`) has no trailing forward slash (`https://server`, not `https://server/`).

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

### Images are not the size I expected

- Check the values for `SNAP_IMG_WIDTH`, `SNAP_IMG_HEIGHT`
- Check the value for `SNAP_IMG_SCALE`: If 0.5, dimensions are halved, if 2, dimensions are doubled, etc.
- Check whether the viewport is set (overriding the default) for the dashboard or step.
- The height of `_full` images is determined by each dashboard's default container size.

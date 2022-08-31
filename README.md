# App Screenshots

This repository contains the code and configuration for a tool that takes screenshots of web applications, and their selected UI elements (menus, buttons).

- It connects to an app, loading specified pages, taking screen shots of whole screens or portions (HTML elements), saving the images as JPG or PNG.

- It uses [Playwright] to run a headless Chromium, Firefox or Webkit web browser. A JSON file defines what to snap (whole pages, panels, buttons, menus, etc.), and any preliminary tasks (*operations* and *steps*) needed to set up the screenshot (open a menu, enter text, etc.).


## Install (Pre-requirements)

- [Node.js](https://nodejs.org/en/download/)
- [Playwright](https://github.com/microsoft/playwright/)
- [Yargs](https://github.com/yargs/yargs)
- [Axios](https://github.com/axios/axios)

```sh
npm i playwright yargs axios
```

## Quick Start

1. Clone this repository.

2. Snap pages in the example app ([PMM2 demo instance](https://pmmdemo.percona.com/)):

    ```sh
    cd app-screenshots
    ./run.sh
    ```

    Or, to snap specific pages:

    ```sh
    ./run.sh --uid=pmm-home,node-memory,mysql-instance-overview
    ```

    To see a list of available page UIDs:

    ```sh
    ./run.sh --list
    ```

## Usage

To create screenshots for your own application:

1. Create a new JSON file `./cfg/server-<my app>.json`.

2. Edit this new file and set values for the fields:

   - `"name"`: A free-form name for your app. (Snapped images will be saved in a subdirectory with this name.)
   - `"server"`: The HTTPS server IP or hostname.
   - `"graph"`: For PMM2 instances, the word `"graph"`. For PMM1, an empty value (`""`)
   - `"wait"`: The number of milliseconds to wait for a page to load. (10000 to 20000 for local instances, 30000 or more for remote instances.)

   These fields are configurable but don't need changing:

   - `dshbd` is `"d"` for both PMM1 and PMM2.
   - `"pause"` is a shorter wait interval used when snapping mouse-over tooltips. 1000-5000ms is enough.

3. Set values for environment variables (in your shell, or in `run.sh` where examples and explanations are given).

   - `SNAP_SRV_CFG_FILE`: The path to your newly-created server configuration file (created in step 1).

   If your app has a log-in step, you should also set `SNAP_USER` and `SNAP_PASS`.

   Optional:

   - `SNAP_IMG_WIDTH`: The snap image width (in pixels). Default: 1280
   - `SNAP_IMG_HEIGHT`: The snap image height (in pixels). Default: 720
   - `SNAP_JPG_QUALITY`: For JPG format, the image quality (a percent value) can help reduce file size. Default: 100
   - `SNAP_IMG_EXT`: Set to `.png` for PNG format images. Default: `.jpg`
   - `SNAP_IMG_SEQ`: Set to `true` to prefix image filenames with a sequence number. Useful for testing and identifying images. Default: `false`
   - `SNAP_IMG_PFX`: After the optional sequence number, a secondary prefix is added to the filename. Default: `PMM`
   - `SNAP_IMG_DIR`: Where to save images. Default: `./images`. This is the base directory within which two additional subdirectories are created: `<name>/SNAP_IMG_WIDTHxSNAP_IMG_HEIGHT`. E.g `./images/myserver/1920x1080/`
   - `SNAP_LOG_IN`: Set to true to snap the login page, log in, and click the 'skip password change' button. Default: true.

4. Run the wrapper script:

   ```sh
   ./run.sh
   ```

Optional arguments:

`--debug`
: Show values used.

`--full`
: Also snap the full page beyond the specified viewport (`SNAP_IMG_WIDTH` x `SNAP_IMG_HEIGHT`).

## Tips

### Changing selectors (IDs of UI elements)

Because apps are built with to different standards, there is a lot of logging to show what is happening and what is being snapped.

For example, if the logs will show a timeout when trying to locate a selector that doesn't exist,
you should load the app in a browser, navigate to the page in question and activate your browser's development tools.
These contain an option to select an element to find its selector and compare it with that defined in the `pages.json` file.

Where possible, use keyboard shortcuts to interact with the UI rather than hunting for selectors (use `press` instead of `click`).

Ask developers to allocate static names to frequently used elements.

### Multiple runs

By default, image filenames don't include a sequence number prefix.

When debugging or testing this tool, edit `run.sh` and set `SNAP_IMG_SEQ=true`.
This will create images numbered by their order in the app's `pages.json` specification file.

You can also use the `SNAP_IMG_PFX` and `SNAP_IMG_DIR` environment variables in `run.sh` to separate runs of the tool.

### Login problems

You can set login credentials (on the command line or in `run.sh`) with the variables `SNAP_USER` and `SNAP_PASS`.

## How it works

`main.js` loops through entries in the defined pages configuration file (default `./cfg/pages.json`), processing each page, its operations and steps, one by one.

The basic structure of a pages configuration file is:

```
One or more pages
  Zero or more operations
    One or more steps
```

- A page can be specified more than once. This is useful if the same page needs to be snapped with a different sized browser window, or there are individual components (e.g. menus, buttons, specific panels) to be snapped separately as well as the whole window.

- You can specify one or more operations to define what should happen prior to a snap. For example, you can hover over something to reveal a tooltip, select an item in a list, enter text into a field, or go through the step-by-step process of adding, editing and deleting something. You can snap the whole window or an HTML element as specified by its CSS selector.

- An operation is a group of steps. Except for 'wait', a selector specifies the CSS selector to move to, click on, enter text into, blur (to obscure it), or snap. A step's type is one of:

    - `move`: move to (hover over) a selector;
    - `text`: enter text into the selector;
    - `click`: click the selector;
    - `press`: perform one or more keystrokes;
    - `blur`: blur (make fuzzy) the element specified by selector;
    - `wait`: explicitly wait for the specified period (in ms);
    - `snap`: Explicitly snap the the specified selector or the whole viewport.

- If no operations are specified, a page entry causes a single full-window snap. If operations are specified, you must explicitly snap the window or its elements (using the `selector` field).

See also [Page definitions](#page-definitions-pagesjson).

### Program Files

There are three Node.js files and three configuration files.

#### main.js

The core of `main.js` loops through the pages file, processing each page entry, and looping through its operations and steps.

#### util.js

Functions for common operations, the most important of which are:

`snap(page, title, dir, full)`
: `page` = a page or an element;
`title` = the filename title (before prefixing and character replacement);
`dir` = the save directory;
`full` = whether to snap the entire page (needs prior viewport adjustment).

`load(page, url, wait)`
: Loads `url` into browser's `page` and waits `wait` milliseconds.

A brief description of other functions:

- `mkdir()`: Creates the image save directories.
- `login()`: Handles the special case of the main login page.
- `eat()`: Removes an 'accept cookies' pop-up dialogue. (Added for [PMM Demo](https://pmmdemo.percona.com/).)

#### config.js

Loads and provides a common access to page and defaults configuration files.

### Configuration Files

#### Default values: `defaults.json`

Values in this file are the default settings if no environment variables are set or command line arguments provided to `run.sh`. Below are the available fields and corresponding environment variables and command-line options, where appropriate.

`version`
: Version of the app for which these defaults apply (i.e. have been tested).

`config_file`
: Path to default server configuration file. (`SNAP_SRV_CFG_FILE`)

`pages_file`
: Path to default pages configuration file. (`SNAP_PAGES_FILE`)

`user`
: App user's login name. (`SNAP_USER`)

`pass`
: App user's password. (`SNAP_PASS`)

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

`jpg_quality`
: For JPG images, the quality setting. Lower values are useful for documentation pages with many full-screen snaps. Values of 50 or above produce acceptable results for web and print copy. (`SNAP_JPG_QUALITY`)

`log_in`
: Whether to attempt logging in using `user` and `pass` values. (`SNAP_LOG_IN`)

`headless`
: When `true`, Playwright uses a headless (invisible) web browser. If `false`, the web browser is made visible. Useful for debugging (or simply entertainment). (`SNAP_HEADLESS`)

`debug`
: When `true`, program prints operating parameters. (`--debug`)

`login_user_elem`
: The CSS selector ID for the app's login screen user input text field.

`login_pass_elem`
: The CSS selector ID for the app's login screen password input text field.

`login_skip_elem`
: The CSS selector ID for any password change 'Skip' button (seen after first logging in).

`cookie_popup_elem`
: The CSS selector ID for any 'Accept cookies' dialogue (which is removed before snapping).

`container`
: The CSS selector ID for the page body, excluding left and top menu bars. This is used by the `--full` option to snap the entire page beyond the specified viewport.

#### Server configuration: `server-*.json`

Defines app instances: their URLs and default page load time.

`name`
: Name identifying the instance. (Used in the image save path.)

`server`
: Base URL for the instance (`https://<IP or server name>`).

`p1`, `p2`, `p3`
: Optional page prefixes.

`wait`
: Default pre-page load wait time in milliseconds. For slow networks or instances.

`pause`
: A shorter wait time in milliseconds, to allow the UI to settle before snapping items such as drop-down menus, mouse-over tooltips, or to complete the loading of data in panel components. Default: 6000.

#### Page definitions: `pages.json`

The bulk of configuration is in these files. They list each page's UID (part of the URL), what items to click before snapping, which operations and steps to perform, and which specific elements to snap individually (e.g various UI devices or panels).

*Snaps occur in the order listed in this file.*

`versions`
: List of app versions for which this configuration works. (Not currently used.)

`pages`
: Array of items, each representing a page with optional items.

   `title`
   : The name of the page. This becomes part of the image filename.

   `uid`
   : The page's UID.

   `url` (optional)
   : Override the default page path.

   `wait` (optional)
   : Override the default page load wait time in the server `config-*.json` file. The value is in milliseconds.

   `options` (optional)
   : An array of URL option strings appended to the page load URL. Used to snap pages with a specific service name, node name, or any page where URL options are used to select pages.

   `operations` (optional)
   : A list of tasks, each task being a name and a list of steps. page entries without operations are snapped automatically. If `operations` is present, pages and page elements must be explicitly snapped using a `"type": "snap"` element within a `"step"` element. Operations are used where a sequence of actions is needed to show menus, perform tasks such as selecting and deleting items, showing tooltips, or snap specific GUI elements and panels.

      `name`
      : A name for this operation (group of steps).

      `viewport`
      : A viewport for this operation.

      `steps`
      : An array of individual steps.

         `name`
         : Name for this step.

         `type`
         : Type of step. One of:

            `back`
            : Return to the previous page.

            `wait`
            : Wait for `period` milliseconds.

            `move`
            : Move to (hover over) the element specified by `selector`. (Uses [`page.hover()`](https://playwright.dev/docs/api/class-page#pagehoverselector-options) which finds the first CSS selector ID and positions the mouse in the center of it.)

            `text`
            : Enter `value` text into element `selector`.

            `press`
            : Press each of the keys in the `value` array.

            `click`
            : Click the element `selector`.

            `blur`
            : Blur (make illegible) the element `selector`.

            `highlight`
            : Draw a yellow dotted line around `selector`.

            `unhighlight`
            : Remove the yellow dotted line around `selector`.

            `snap`
            : Screenshot the window. If a `selector` is given, screenshot only it. If `viewport` is given, adjust the window to that size before snapping.

         `selector`
         : The CSS selector for the clickable item.

         `viewport`
         : Each step can specify its own viewport which overrides either the outer page or default viewport.

            `width`, `height`
            : Width and height (in pixels) for this step's viewport (if snapped).

Some entries have a `comment` field. This is ignored, as are any other fields not mentioned above.

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
- System path separator.

**Note:** The purpose of a hierarchy is to separate images made with different servers and viewport sizes.

The file name is constructed in `snap()` in `util.js` and is made of each page's entry values (with optional prefixes). Each part is separated with a single underscore ("_").

- (Optional primary prefix) If `img_seq` or `SNAP_IMG_SEQ` is true, a zero-padded integer, incremented for each image.
- (Optional secondary prefix) The value of `img_pfx` or `SNAP_IMG_PFX`
- `pages.title`
- (If operations)
  - `pages.operations.name`
  - `pages.operations.steps.name`
- (If not operations and `--full` option is set) "_full"
- `img_ext` or `SNAP_IMG_EXT` (file extension)


**Note:** Spaces, back slashes (`\`), forward slashes ('/'), and dots (`.`) in titles and names are replaced with underscores (in `util.snap()`).

## Problems and Troubleshooting

This tool was made to make it easier to repeat screenshots for an app's technical documentation. However, the code needs constant nurturing and updating. Every change to an app usually means a change to the code or configuration files.

### General

The server URL  (`server` in `server-*.json`) has no trailing forward slash (`https://server`, not `https://server/`).

### Changed CSS selectors

Use your browser's developer's mode to inspect the element causing trouble. Check that the CSS selector matches that specified. This tool uses CSS selectors but xpaths also work.

### Time-outs or blank snaps

Some pages take longer to load than others. Panels in some snaps will show they are still loading, or portions will be blank. For these, extend the loading time with the per-page wait value.

### Page load wait time

This tool strives for flexibility over speed, allowing each page snap to be resized, and allowing for partial snaps illustrating particular features or emphasising specific panels. This means the window size (viewport) has to be reset for every snap. In Playwright, that means you must reload the page and wait for it after each viewport change. Consequently, snapping all pages takes around an hour with default settings.

There are two ways to shorten the time spent using this tool.

1. Reduce the default page wait time. This can speed things up but some pages won't finish loading before the snap is taken.

2. Use the `--uid` option to snap specific pages.

3. Don't use the `--full` option. This works by setting the viewport to 10 times the default height, reloading the page, waiting, snapping the container element, resetting the viewport and again reloading the page and waiting.

### Images are not the size I expected

- Check the values for `SNAP_IMG_WIDTH`, `SNAP_IMG_HEIGHT`
- Check whether the viewport is set (overriding the default) for the page or step.
- The height of `_full` images is determined by each page's default container size.

[Playwright]: https://playwright.dev

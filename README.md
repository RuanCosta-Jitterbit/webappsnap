# App Screenshots

This program lets you automate the task of
taking screenshots of web applications.
It uses [Playwright] to programmatically run a
set of actions in a
Chromium, Firefox or Webkit-based web browser.

You define the actions in a JSON file
as a list of pages to load, and
operations and steps to perform on each page.
You can snap whole pages, parts of pages, buttons, menus, etc.,
so long as they can be consistently identified (via a *selector*).

## Install (Pre-requirements)

- [Node.js](https://nodejs.org/en/download/)
- [Playwright](https://github.com/microsoft/playwright/)
- [Yargs](https://github.com/yargs/yargs)
- [Axios](https://github.com/axios/axios)

Once Node.js is installed, install the remaining components with this command:

```sh
npm i playwright yargs axios
```

## Quick Start

> This section uses configuration created for Percona's [PMM] database
> monitoring tool to take screenshots of the [PMM Demo] instance.

1. Clone this repository.

2. Snap pages in the example app.

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

You must create configuration files
for your own application.

1. Make backup copies of these files.

   - `cfg/defaults.json`

   - `cfg/pages.json`

   - `cfg/server.json`

2. Edit the originals.

   - `defaults.json`

      This file contains default values, many of which can be
      overridden with environment variables (shown in parenthesis)
      or command line options in the `run.sh` wrapper script.

      - `version`: Not currently used.
         (Intended to be the version of the app for which these defaults apply.)

      - `config_file`: Path to default server configuration file. (`SNAP_SRV_CFG_FILE`)

      - `pages_file`: Path to default pages configuration file. (`SNAP_PAGES_FILE`)

      - `user`: App user's login name. (`SNAP_USER`)

      - `pass`: App user's password. (`SNAP_PASS`)

      - `img_dir`: Where to save images. (`SNAP_IMG_DIR`)

      - `img_seq`: Whether to add a primary file name prefix as a zero-padded 3-digit sequence number. (`SNAP_IMG_SEQ`)

      - `img_pfx`: The secondary file name prefix for each snap file. (`SNAP_IMG_PFX`)

      - `img_ext`: File name extension, either `.png` or `.jpg`. (`SNAP_IMG_EXT`)

      - `img_width`: The image width, in pixels, for full screen snaps. (`SNAP_IMG_WIDTH`)

      - `img_height`: The image height, in pixels, for full screen snaps. (`SNAP_IMG_HEIGHT`)

      - `jpg_quality`: For JPG images, the quality setting. Lower values are useful for documentation pages with many full-screen snaps. Values of 50 or above produce acceptable results for web and print copy. (`SNAP_JPG_QUALITY`)

      - `log_in`: Whether to attempt logging in using `user` and `pass` values. (`SNAP_LOG_IN`)

      - `headless`: When `true`, Playwright uses a headless (invisible) web browser. If `false`, the web browser is made visible. Useful for debugging (or simply entertainment). (`SNAP_HEADLESS`)

      - `debug`: When `true`, program prints operating parameters. (`--debug`)

      - `login_user_elem`: The CSS selector ID for the app's login screen user input text field.

      - `login_pass_elem`: The CSS selector ID for the app's login screen password input text field.

      - `login_skip_elem`: The CSS selector ID for any password change 'Skip' button (specific to PMM).

      - `cookie_popup_elem`: The CSS selector ID for any 'Accept cookies' dialogue (which is removed before snapping).

      - `container`: The CSS selector ID for the page body, excluding left and top menu bars. This is used by the `--full` option to snap the entire page beyond the specified viewport.

   - `server.json`

      This file defines an individual app. If you have the same app on different
      hostnames, use a different file for each.

      - `name`: A free-form name for your app.
         (Snapped images will be saved in a subdirectory with this name.)

      - `server`: The full HTTPS server IP or hostname.

      - `a` to `f`: General-purpose prefixes. Use them for URLs such as
         `server/a/b/c/page`

         For example, on [PMM Demo], page URLs take the form:

         `https://pmmdemo.percona.com/graph/d/<page UID>`

         Since the configuration only needs to list the page UIDs,
         set `a` to `graph` and `b` to `d`.

      - `login`: The app's login path (relative to `server`).

         Examples: `login`, `landing/login`

      - `single_login_page`: `true` or `false`.
         True means the selectors specified for `login_user_elem` and `login_pass_elem` in the defaults file are on the same page.
         False means they are on subsequent pages.

      - `wait`: The number of milliseconds to wait for a page to load.
         Increase this if the app loads slowly and snaps happen before
         a page is fully loaded. Decrease it to spend less time waiting
         when snapping many pages.

      - `pause`: A shorter wait interval used when snapping mouse-over tooltips.
         Set between 1000-5000ms.

   - `pages.json`

      This file defines what to do with your app and what to snap.
      It is a JSON file with a single node consisting of an array of
      pages. Pages are identified by their `uid`, the last part of the URL.

      (Look in `cfg/percona-pmm/pages-pmm2.json` for examples.)

      Snaps happen in the order listed in this file.

      - `versions`: Not currently used. (List of app versions for which this configuration works.)

      - `pages`: Array of items, each representing a page with optional items.

         - `title`
         : The name of the page. Included in image filename.

         - `uid`: The page's UID.

         - `url` (optional): Override the default page path. Use this if
            the URL can't be formed from the `server`, `a`-`f`, and page UID
            parts.

         - `wait` (optional): Override the default page load wait time in the server `server.json` file. The value is in milliseconds.

         - `options` (optional): An array of URL option strings appended to the page load URL.

         - `operations` (optional): A list of tasks, each task being a named list
            of steps. Page entries without operations are snapped automatically.
            If `operations` is present, pages and page elements must be explicitly
            snapped using a `"type": "snap"` element,
            usually as the last of a `step` element.
            Operations are used where a sequence of actions is needed to show menus,
            perform tasks such as selecting and deleting items,
            showing tooltips, or snap specific GUI elements and panels.

            - `name`: A name for this operation (group of steps). Included in image filename.

            - `viewport`: A viewport for this operation.

            - `steps`: An array of individual steps.

               - `name`: Name for this step. Included in image filename.

               - `type`: Type of step. One of:

                  - `back`: Return to the previous page.

                  - `wait`: Wait for `period` milliseconds.

                  - `move`: Move to (hover over) the element specified by `selector`.
                     (Uses [`page.hover()`](https://playwright.dev/docs/api/class-page#pagehoverselector-options)
                     which finds the first CSS selector ID and positions the mouse in the center of it.)

                  - `text`: Enter `value` text into element `selector`.

                  - `press`: Press each of the keys in the `value` array.

                  - `click`: Click the element `selector`.

                  - `blur`: Blur (make illegible) the element `selector`.

                  - `highlight`: Draw a yellow dotted line around `selector`.

                  - `unhighlight`: Remove the yellow dotted line around `selector`.

                  - `snap`: Snap the window.
                     If a `selector` is given, snap only it.
                     If `viewport` is given, adjust the window to that size before snapping.

               These can be set for most steps.

               - `selector`: The CSS selector for the clickable item.

               - `viewport`: Each step can specify its own viewport which overrides either the outer page or default viewport.

                  - `width`, `height`: Width and height (in pixels) for this step's viewport (if snapped).

      Some entries have a `comment` field. This is ignored, as are any other fields not
      mentioned above.

3. Set values for the following environment variables.
   Do it in your shell, or in `run.sh`, where examples and explanations are given.

   - `SNAP_DEFAULTS_FILE`: Path to the default values file.
      Default is `./cfg/defaults.json` (see `config.js`).

   - `SNAP_SRV_CFG_FILE`: The path to the `server.json` file.
      Default is the value of `config_file` in the defaults file.

   - `SNAP_USER`, `SNAP_PASS`: If your app has a log-in step,
      set these. **CAUTION** The password must remain in
      plain text. (A big TODO.)
      Defaults are the values of `user` and `pass` in the
      defaults file.

   Optional:

   - `SNAP_IMG_WIDTH`, `SNAP_IMG_HEIGHT`: Snap image width
      and height (in pixels).
      Defaults are the values of `img_width`
      and `img_height` in the defaults file.

   - `SNAP_JPG_QUALITY`: (Only for JPG format.) The image quality
      as a percent value.
      Default is the value for `jpg_quality`
      in the defaults file.

   - `SNAP_IMG_EXT`: The image type, `.png` or `jpg`.
      Default is the value for `img_ext` in the defaults file.

   - `SNAP_IMG_SEQ`: Set to `true` to add a sequence number prefix
      to saved image filenames.
      Useful for testing and identifying which page,
      operation or step in `pages.json` produced a particular
      image.
      Default is the value for `img_seq` in the defaults file.

   - `SNAP_IMG_PFX`: Image filename prefix.
      After the optional sequence number, a secondary prefix is added to the filename.
      Default is the value for `img_pfx` in the defaults file.

   - `SNAP_IMG_DIR`: Where to save images,
      the base directory within which two additional subdirectories
      are created: `<name>/SNAP_IMG_WIDTHxSNAP_IMG_HEIGHT`.
      E.g `./images/myserver/1920x1080/`
      Default is the value for `img_dir` in the defaults file.

   - `SNAP_LOG_IN`: Set to `true` to snap the login page, then log in.
      Default is the value for `log_in` in the defaults file.

4. Run the wrapper script:

   ```sh
   ./run.sh
   ```

   Optional arguments:

   - `--debug`: Show values used.

   - `--full`: Also snap the full page beyond the specified viewport (`SNAP_IMG_WIDTH` x `SNAP_IMG_HEIGHT`).

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

### Program Files

There are three Node.js files.

- `main.js`

   The core of `main.js` loops through the pages file, processing each page entry, and looping through its operations and steps.

- `util.js`

   Functions for common operations, the most important of which are:

   - `snap(page, title, dir, full)`

      - `page` = a page or an element;
      - `title` = the filename title (before prefixing and character replacement);
      - `dir` = the save directory;
      - `full` = whether to snap the entire page (needs prior viewport adjustment).

   - `load(page, url, wait)`: Loads `url` into browser's `page` and waits `wait` milliseconds.

   A brief description of other functions:

   - `mkdir()`: Creates the image save directories.

   - `login()`: Handles the special case of the main login page.

   - `eat()`: Removes an 'accept cookies' pop-up dialogue. (Added for [PMM Demo](https://pmmdemo.percona.com/).)

   - `config.js`: Loads and provides a common access to page and defaults configuration files.

## Image file names

The image file path is made up of the directory and the filename.

The directory path is a hierarchy constructed in `main.js`. It is made up of:

- Defaults file `img_dir` (or `SNAP_IMG_DIR` if set)

- System path separator (e.g. `/` on Linux).

- Server configuration file `name`

- System path separator.

- Defaults file `img_width` (or `SNAP_IMG_WIDTH` if set)

- `x`

- Defaults file `img_height` (or `SNAP_IMG_HEIGHT` if set)

- System path separator.

The purpose of the hierarchy is to separate images made with different servers and viewport sizes.

The file name is constructed in `snap()` in `util.js` and is made of each page's entry values (with optional prefixes). Each part is separated with a single underscore (`_`).

- (Optional primary prefix) If `img_seq` or `SNAP_IMG_SEQ` is true, a zero-padded integer, incremented for each image.

- (Optional secondary prefix) The value of `img_pfx` or `SNAP_IMG_PFX`

- `pages.title`

- (If operations)

  - `pages.operations.name`

  - `pages.operations.steps.name`

- (If not operations and `--full` option is set) `_full`

- `img_ext` or `SNAP_IMG_EXT` (file extension)

> **Note:** Spaces, back slashes (`\`), forward slashes ('/'), and dots (`.`) in titles and names are replaced with underscores (in `util.snap()`).

## Problems and Troubleshooting

This tool was made to make it easier to repeat screenshots for an app's technical documentation.
However, the configuration needs constant nurturing and updating.
Every change to an app usually means a change to configuration files,
and sometimes the code.

- Server URL: The server URL (`server` in `server.json`) has no trailing forward slash (`https://server`, not `https://server/`).

- Changed CSS selectors: Use your browser's developer's mode to inspect the element causing trouble. Check that the CSS selector matches that specified. This tool uses CSS selectors but xpaths also work.

- Time-outs or blank snaps: Some pages take longer to load than others. Panels in some snaps will show they are still loading, or portions will be blank. For these, extend the loading time with the per-page wait value.

- Page load wait time: This tool strives for flexibility over speed, allowing each page snap to be resized, and allowing for partial snaps illustrating particular features or emphasising specific panels. This means the window size (viewport) has to be reset for every snap. In Playwright, that means you must reload the page and wait for it after each viewport change. Consequently, snapping all pages takes around an hour with default settings.

   There are two ways to shorten the time spent using this tool.

   1. Reduce the default page wait time. This can speed things up but some pages won't finish loading before the snap is taken.

   2. Use the `--uid` option to snap specific pages.

   3. Don't use the `--full` option. This works by setting the viewport to 10 times the default height, reloading the page, waiting, snapping the container element, resetting the viewport and again reloading the page and waiting.

- Images are not the size I expected

   - Check the values for `SNAP_IMG_WIDTH`, `SNAP_IMG_HEIGHT`

   - Check whether the viewport is set (overriding the default) for the page or step.

   - The height of `_full` images is determined by each page's default container size.

[Playwright]: https://playwright.dev
[PMM Demo]: https://pmmdemo.percona.com
[PMM]: https://www.percona.com/software/database-tools/percona-monitoring-and-management
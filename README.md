# webappsnap - Automated Web App Screenshots

This program lets you automate the task of taking screenshots of web applications. It uses [Playwright](https://playwright.dev) to programmatically run a set of actions in a Chromium, Firefox, or Webkit-based web browser. The session's tasks can optionally be recorded as a `webm` video.

You define the actions in a JSON file as a list of pages to load, and operations and steps to perform on each page. You can snap whole pages, parts of pages, buttons, menus, etc., so long as they can be consistently identified (via a *selector*).

To snap pages, you only need to know their URLs. To interact with buttons, menus, or text fields, or any elements of a web page, you also need to know the element's selector. Use a browser's development tools to discover these.

## Install (Pre-requirements)

-   [Node.js](https://nodejs.org/en/download/)
-   [Playwright](https://github.com/microsoft/playwright/)
-   [Yargs](https://github.com/yargs/yargs)
-   [Prompt-Sync](https://github.com/heapwolf/prompt-sync)

Once Node.js is installed, install the remaining components with this command:

```shell
npm i playwright yargs prompt-sync
```

## Quick Start

> This section uses configuration created for Percona's [PMM](https://www.percona.com/software/database-tools/percona-monitoring-and-management) database monitoring tool to take screenshots of the [PMM Demo](https://pmmdemo.percona.com) instance.

1.  Clone this repository.

2.  In a terminal, change directory to where you cloned it.

3.  Run the script:

    ```sh
    ./run.sh --config ./cfg/percona.pmm.json --instance pmmdemo
    ```

    This snaps all the pages on [PMM Demo](https://pmmdemo.percona.com). It takes around 45 minutes. The images are saved in `images/percona/pmmdemo`.

## Usage

You must create configuration files for your own application.

1.  Make a copy of `cfg/template.json`

2.  Set values for these:

    -   `settings:` This section contains general settings for the snap:

        -   `img_dir`: Where to save images.

        -   `seq`: `true` or `false`. (Optional) Add a zero-padded 3-digit sequence number to each saved image filename.

        -   `pfx`: String or empty. (Optional) Additional filename prefix for each saved image filename.

        -   `sep`: String or empty. (Optional) Replace slash, space, or dot in final image filenames with this character.

        -   `ext`: `.png` or `.jpg`. Image type and filename extension.

        -   `img_width`: The image width, in pixels, for full screen snaps.

        -   `img_height`: The image height, in pixels, for full screen snaps.

        -   `jpg_quality`: For JPG images, the quality setting. Lower values are useful for documentation pages with many full-screen snaps. Values of 50 or higher produce acceptable results for web and print copy.

        -   `headless`: `true` or `false`. Playwright uses a headless (invisible) web browser. If `false`, the web browser is made visible. Useful for debugging (or simply entertainment).

        -   `debug`: `true` or `false`. When `true`, program prints operating parameters.

        -   `randlen`: Integer. How many bytes of random data to replace the token `RANDOM` in text values.

    -   `instance:` A node for every distinct instance (app) you want to snap:

        -   `server`: The full HTTPS server IP or hostname.

        -   `a` to `f`: General-purpose prefixes. Use them for URLs such as `server/a/b/c/page`

            For example, on [PMM Demo](https://pmmdemo.percona.com), page URLs take the form:

            `https://pmmdemo.percona.com/graph/d/<page UID>`

            Since the configuration only needs to list the page UIDs, the `cfg/percona.pmm.json` configuration file has `"a": "graph"` and `"b": "d"`.

        -   `wait`: Integer. The number of milliseconds to wait for a page to load. Increase this if the app loads slowly and snaps happen before a page is fully loaded. Decrease it to spend less time waiting when snapping many pages.

        -   `pause`: Integer. A shorter wait interval used when snapping mouse-over tooltips. Set between 1000-5000ms.

        -   `login_filename`: String. Filename containing the app's login name.

        -   `password_filename`: String. Filename containing the app's login password.

    -   `pages`: This defines what to do with your app and what to snap. It is a single node consisting of an array of pages. Pages are identified by their `uid`, the last part of the URL. Snaps happen in the order listed in this node.

        -   `skip`: `true` or `false` (Optional) Set to `true` to skip this page.

        -   `name`: String. (Optional) The name of the page. Included in image filename.

        -   `comment`: String (Optional) Commentary.

        -   `uid`: String. The page's UID.

        -   `url`: String. (Optional) Override the default page path. Use this if the URL can't be formed from the `server`, `a`-`f`, and page UID parts.

        -   `wait`: Integer. (Optional) Override the default page load wait time (`instance.<instance-name>.wait`). The value is in milliseconds.

        -   `options`: (Optional): An array of URL option strings appended to the page load URL.

        -   `operations`: (Optional) A list of tasks, each task being a named list of steps. Page entries without operations are snapped automatically. If `operations` is present, pages and page elements must be explicitly snapped using a `"type": "snap"` element. Operations are used where a sequence of actions is needed to show menus, perform tasks such as selecting and deleting items, showing tooltips, or snap specific GUI elements and panels.

            -   `skip`: `true` or `false`. (Optional) Set to `true` to skip this operation.

            -   `name`: String. A name for this operation (group of steps). Included in image filename.

            -   `viewport`: A viewport for this operation. Each operation can have its own viewport, which overrides the page's or default viewport for the scope of the operation.

                -   `width`, `height`: Width and height (in pixels) for this operations's viewport.

            -   `loop`: Integer. (Optional) Repeat this operation's steps `loop` times. (Default is 1.)

            -   `steps`: An array of individual steps.

                -   `skip`: (optional) Set to `true` to skip this step.

                -   `name`: (optional) Name for this step. Included in image filename.

                -   `type`: Type of step. One of:

                    -   `ask`: Prompt for a value to be inserted into the `selector` field.

                    -   `back`: Return to the previous page.

                    -   `click`: Click the element `selector`.

                    -   `dblclick`: Double-click the element `selector`.

                    -   `edit`: Change the text content of `selector`.

                    -   `focus`: Focus on the element `selector`.

                    -   `move`: Move to (hover over) the element specified by `selector`. (Uses [`page.hover()`](https://playwright.dev/docs/api/class-page#pagehoverselector-options) which finds the first CSS selector ID and positions the mouse in the center of it.)

                    -   `press`: Press each of the keys in the `value` array.

                    -   `replace`: TODO

                    -   `snap`: Snap the window. If a `selector` is given, snap only it. If `viewport` is given, adjust the window to that size before snapping.

                    -   `style`: Insert the CSS code provided by the `content` field.

                    -   `text`: Enter `value` text into element `selector`. If `value` is the word `RANDOM`, a random 5-digit hex string (10 characters) is entered. If the word `LOGIN`, value is taken from the contents of a `instance.login_filename` file. If `PASSWORD`, value is taken from `instance.password_filename`.

                    -   `quit`: Exit immediately.

                    -   `wait`: Wait for `value` milliseconds.

                    These can be set for most steps.

                    -   `locator`: The locator type, one of: `css`, `getbytext`, `getbyrole`

                    -   `selector`: The selector for the item, defined according to the locator's format.

                    -   `viewport`: Each step can specify its own viewport which overrides either the outer page or default viewport.

                        -   `width`, `height`: Width and height (in pixels) for this step's viewport (if snapped).

                    -   `options`:

                        -   `clip`: For full page snaps (not selectors). See <https://playwright.dev/docs/api/class-page#page-screenshot-option-clip>

3.  Run the wrapper script:

    ```shell
    ./run.sh -- config ./cfg/my-config.json --instance instance-name
    ./run.sh -- config ./cfg/my-config.json --instance instance-name
    ```

    Optional arguments:

    -   `--debug`: Show values used.

    -   `--full`: Also snap the full page beyond the specified viewport.

## Tips

-   **Changing selectors (IDs of UI elements)**

    Because apps are built to different standards, the program outputs a lot of messages to show what is happening and what is being snapped.

    If the logs show a timeout when trying to locate a selector that doesn't exist, you should load the app in a browser, navigate to the page in question and activate your browser's development tools. These contain an option to select an element to find its selector and compare it with that defined in the `pages` section of the configuration file. Where possible, use keyboard shortcuts to interact with the UI rather than hunting for selectors (use `press` instead of `click`). Ask developers to allocate static names to frequently used elements.
    If the logs show a timeout when trying to locate a selector that doesn't exist, you should load the app in a browser, navigate to the page in question and activate your browser's development tools. These contain an option to select an element to find its selector and compare it with that defined in the `pages` section of the configuration file. Where possible, use keyboard shortcuts to interact with the UI rather than hunting for selectors (use `press` instead of `click`). Ask developers to allocate static names to frequently used elements.

-   **Multiple runs**

    By default, image filenames don't include a sequence number prefix. When debugging or testing, set `settings.debug=true` in your configuration file. This will create images numbered by their order in the `pages` node.
    By default, image filenames don't include a sequence number prefix. When debugging or testing, set `settings.debug=true` in your configuration file. This will create images numbered by their order in the `pages` node.

-   **Commenting out pages**

    JSON doesn't have a system for commenting out portions of a file. To skip snapping certain pages, add a `skip` item with value `true`.

## Problems and Troubleshooting

This tool was made to make it easier to repeat screenshots for an app's technical documentation. However, the configuration needs constant nurturing and updating. Every change to an app usually means a change to configuration files, and sometimes the code.

-   **Server URL**

    The server URL (`server` in `settings` node) has no trailing forward slash (`https://server`, not `https://server/`).

-   **Changed CSS selectors**

    Use your browser's developer's mode to inspect the element causing trouble. Check that the CSS selector matches that specified. This tool mainly uses CSS selectors but xpaths also work.

-   **Time-outs or blank snaps**

    Some pages take longer to load than others. Panels in some snaps will show they are still loading, or portions will be blank. For these, extend the loading time with the per-page wait value.

-   **Page load wait time**

    This tool strives for flexibility over speed, allowing each page snap to be resized, and allowing for partial snaps illustrating particular features or emphasising specific panels. This means the window size (viewport) has to be reset for every snap. In Playwright, that means you must reload the page and wait for it after each viewport change. Consequently, snapping all pages takes around an hour with default settings.

    There are two ways to shorten the time spent using this tool.

    1.  Reduce the default page wait time. This can speed things up but some pages won't finish loading before the snap is taken.

    2.  Don't use the `--full` option. This works by setting the viewport to 10 times the default height, reloading the page, waiting, snapping the container element, resetting the viewport and again reloading the page and waiting.

-   **Images are not the size I expected**

    -   Check the values for `settings.img_width`, `settings.img_height`

    -   Check whether the viewport is set (overriding the default) for the page or step.

    -   The height of `_full` images is determined by each page's default container size.

-   **Choice of browser**

    In `main.js`, locate the code:

    ```js
    const browser = await chromium.launch({
        headless: config.headless,
        slowMo: config.slowmo
    });
    ```

    Change `chromium` to either `firefox` or `webkit`.

## How it works

`main.js` loops through `pages` entries in the defined configuration file, processing each page, its operations and steps, one by one. If an operation has a `loop` value, that operation's steps are repeated as many times as the value of `loop`.

The basic structure of a pages configuration file is:

``` example
One or more pages
  Zero or more operations
    One or more steps
```

-   A page can be specified more than once. This is useful if the same page needs to be snapped with a different sized browser window, or there are individual components (e.g. menus, buttons, specific panels) to be snapped separately as well as the whole window.

-   You can specify one or more operations to define what should happen prior to a snap. For example, you can hover over something to reveal a tooltip, select an item in a list, enter text into a field, or go through the step-by-step process of adding, editing and deleting something. You can snap the whole window or an HTML element as specified by its CSS selector.

-   An operation is a group of steps. Except for 'wait', a selector specifies the CSS selector to operate on.

-   If no operations are specified, a page entry causes a single full-window snap. If operations are specified, you must explicitly snap the window or its elements (using the `selector` field).

### Program Files

There is one Node.js file.

-   `main.js`

    The core of `main.js` loops through the pages file, processing each page entry, and looping through its operations and steps. This also contains functions for common operations, the most important of which are:

    -   `snap(page, title, dir, full)`

        -   `page` = a page or an element;

        -   `title` = the filename title (before prefixing and character replacement);

        -   `dir` = the save directory;

        -   `full` = whether to snap the entire page (needs prior viewport adjustment).

    -   `load(page, url, wait)`: Loads `url` into browser's `page` and waits `wait` milliseconds.

## Image file names

The image file path is made up of the directory and the filename.

The directory path is a hierarchy constructed in `main.js`. It is:

-   `img_dir`

-   System path separator (e.g. =/= on Linux).

-   Server configuration file `name`.

The filename is constructed in `snap()` and is made of each page's entry values (with optional prefixes). Each part is separated with a single underscore (`_`).

-   (Optional primary prefix) If `seq` is true, a zero-padded integer, incremented for each image.

-   (Optional secondary prefix) The value of `pfx`.

-   `pages.name`

-   (If operations)

    -   `pages.operations.name`

    -   `pages.operations.steps.name`

-   (If not operations and `--full` option is set) `_full`

-   `ext` (file extension)

> **Note:** Spaces, back slashes (`\`), forward slashes > (`/`), and dots (`.`) in titles and names are replaced with underscores (in `snap()`).

## TODO

-   [ ] Improve debug/logging facility
-   [ ] handle `net::ERR_INTERNET_DISCONNECTED` (in `load()`)
-   [ ] Find more reliable way to know when page is fully loaded, rather than using `waitFor` with fixed value for all pages (`load()`)
-   [ ] Compute additional container padding needed for `_full` images rather than using absolute value
-   [ ] Rationalize and relocate directory creation code
-   [ ] Img dir doesn't need to be arg of `snap()`
-   [ ] Avoid image overwrite when `seq` is off
-   [ ] Check 'fullpage' option in Playwright (wasn't working as expected in Puppeteer)
-   [ ] Write settings file in images directory (to know what were used for that snap set)
-   [ ] Allow run-time choice of browser technology `{chromium|webkit|firefox}`

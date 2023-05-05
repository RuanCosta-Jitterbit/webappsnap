# webappsnap - Automated Web App Screenshots

## Introduction

This program lets you automate the task of taking screenshots of web applications. It is a Node.js command line program that runs on Windows, Linux, and macOS. It uses [Playwright](https://playwright.dev) to programmatically run a set of actions on an app running in a Chromium browser. (You can optionally record a `webm` video of the session.) You define the actions in a JSON file. (See examples in the `cfg` directory.)

## Install

The program is a Node.js script. Before you run it, follow these steps:

1. Install [Node.js](https://nodejs.org/en/download/).

2. Clone or otherwise get a copy of this repository, and save it on your system.

3. In a command prompt, powershell, or terminal, change directory to where you cloned or saved it. Then run this command to install the required Node.js libraries:

   ```sh
   npm i playwright yargs prompt-sync dayjs
   ```

## Quick Start

After [installing](#install), run this command to take screenshots using a pre-defined configuration file:

```sh
node main.js --config ./cfg/test.json --instance google
```

This does the following:

1. Runs a Chromium browser and opens `https://www.google.com/search` with options `q=webappsnap`, then takes a screenshot of the results page.

2. In the same browser, opens `https://www.google.com/doodles`, enters the text `beethoven` in the search bar and presses the Enter key.

3. Waits 3 seconds and takes a screenshot.

4. Closes the browser.

The program prints information messages as it runs, and saves the screenshot images in `images/google`. It runs in headless mode, so you won't see the browser as it runs. If you want to, edit `cfg/test.json`, change the value for `headless` to `true` (in `settings`), save it and run again.

> If there are errors or blank screenshots, see [Tips](#tips).

## Usage

```sh
node main.js --config <path to configuration file> --instance <instance name> [options]
```

options:

`--full`: ignore the viewport height and snap everything contained within the `instance.<instance name>.container` property.

## Configuration

You must create a JSON configuration file for your app. The best way to start is to make a copy of `cfg/test.json` or any of the other examples in the `cfg` directory. You'll need one for each distinct app that you want to snap. Each file can define one or more versions (`instance`) of the app (for example, test and QA versions of the same app but with different base URLs). But the pages and element names must be the same across the versions. If they are different, you'll need a different configuration file.

> This program was tested on two company's systems. One is [Percona Monitoring and Management] (PMM), a free database monitoring tool built by [Percona], whose [PMM Demo] instance is publicly accessible and useful for testing. The other company is [Jitterbit], a low-code data automation and integration company. Although you can only access their [Harmony] platform via a full or trial subscription, the configuration files for parts of the platform provide a useful insight into how to build up configurations for your own web apps.

The configuration file is a JSON schema with three subschemas:

- [`settings`](#settings): General settings for the screenshots: where to put them, their default size, scale, and file type, whether to number the images, and what filename prefix to use.

- [`instance`](#instance): Settings thst define the app's base URL, login credentials, and default page load time. The subschema is the instance name. You'll supply this name on the command line when you run the program. (See [Usage](#usage).)

- [`pages`](#pages): An array of URLs to load. Each element can optionally contain an [`operations`](#operations) subschema that contains a [`steps`](#steps) array, and each step can be one of various [types](#step-types).

  > Pages, operations, and steps of different types are the building blocks for specifying how to interact with an app, and what to save as screenshots.

To snap whole pages, you only need to know their URLs. To interact with buttons, menus, or text fields, or any elements of a web page, you also need to know the element's _selector_. For this, you should know how to use a browser's developer tools.

### `settings`

The `settings` subschema contains general settings for the snap:

- `dir`: Where to save images. (See [Image File Names](#image-file-names).)

- `timestamp`: `true` or `false`. If `true`, include the current date-time stamp (`YYYYMMDD_HHmmss`) in the image directory.

- `seq`: `true` or `false`. If `true`, add a zero-padded 3-digit sequence number image filenames.

- `pfx`: String or empty. Additional prefix for image filenames. (See [Image File Names](#image-file-names).)

- `sep`: String or empty. Replace slash, space, or dot in final image filenames with this character.

- `ext`: `.png` or `.jpg`. Image filename extension (and type).

- `width` and `height`: The default image pixel width and height for full screen snaps. (This is used unless a page, operation, or step defines a `viewport`.)

- `scale`: The scaling factor for saved images.

- `jpg_quality`: (0-100). The JPEG image quality setting, when saving JPEG images (`"ext": ".jpg"`). Lower values produce lower quality but smaller (file size) image files.

- `headless`: `true` or `false`. If `true`, the web browser runs in headless mode.

- `debug`: `true` or `false`. If `true`, the program prints the settings.

- `randlen`: Integer. How many bytes of random data to replace the token `RANDOM` in `text` step values.

- `video`: `true` or `false`. If `true`, everything the browser does is captured as a `webm` video and saved in the same directory as the images.

### `instance`

The `instance` subschema contains a subschema for every distinct instance (app) you want to snap.

- `a` to `f`: General-purpose prefixes. Use them for URLs such as `server/a/b/c/<page UID>`. (See [Page URLs](#page-urls).)

    For example, on [PMM Demo](https://pmmdemo.percona.com), page URLs take the form `https://pmmdemo.percona.com/graph/d/<page UID>`

    Since the configuration only needs to list the page UIDs, the `cfg/percona.pmm.json` configuration file has `"a": "graph"` and `"b": "d"`.

- `container`: If using the `--full` option, you must specify the element that contains the full scrollable content.

- `user_filename`: String. Filename containing a username. (Used by the `text` [step type](#step-types).)

- `login_filename`: String. Filename containing the app's login name. (Used by the `text` [step type](#step-types).)

- `password_filename`: String. Filename containing the app's login password. (Used by the `text` [step type](#step-types).)

- `pause`: Integer. The number of milliseconds between steps.

- `server`: The full HTTPS server IP or hostname. (Omit trailing slash.)

- `wait`: Integer. The number of milliseconds to wait for a page to load. Increase this if the app loads slowly and snaps happen before a page is fully loaded.

### `pages`

The `pages` subschema is an array where each element defines a page of the web app. Each array item is a JSON schema with the following properties:

- `comment`: String. (Optional) Commentary.

- `name`: String. (Optional) The name of the page. Included in image filename. Spaces are not replaced. Can contain forward slashes (`/`) for which subdirectories are created when images are saved. If using this feature, add a final slash. Example: `"name": "level1/level2/"` saves images to `<settings.dir>/level1/level2/`. The final path and image filename depends on the values for snaps in subsequent operations and steps.

- `options`: (Optional): An array of URL option strings appended to the page load URL. For example, to append `?opt1=val1&opt2=val2` to the page's URL, use:

    ```json
    "options": {
        "opt1=val1",
        "opt2=val2"
        }
    ```

- `skip`: `true` or `false`. (Optional) Set to `true` to skip processing this page.

- `uid`: String. The page's UID. Use this for apps whose pages are a simple suffix to the `instance.<instance name>.server` value (optionally suffixed with `instance.<instance name>.a` to `instance.<instance name>.f`).

- `url`: String. (Optional) Override the default page path. Use this if the URL can't be formed from the `instance.<instance name>.server`, and `instance.<instance name>.server.a`-`f`, and page UID parts.

- `viewport`: A viewport for this page. Each page can have its own viewport for the scope of the page, which overrides the default page viewport (`settings.width` and `settings.height`). It contains the following:

  - `width`, `height`: This page's viewport's pixel width and height.

    Example:

    ```json
    ...
     "viewport": {
        "width": 1200,
        "height": 530
    },
    ...
    ```

    > When a page, operation, or step sets a viewport, the current viewport is restored at the end of the page, operation, or step.

- `wait`: Integer. (Optional) Override the default page load wait time (`instance.<instance name>.wait`). The value is in milliseconds.

- `operations`: An array of steps. (See [Operations](#operations)). Page entries without operations (only `uid`) are snapped automatically. Use operations when you need to perform a sequence of actions (click a menu, enter text, etc) before taking a screenshot snap. In operations and steps, you must add an explicit `snap` step type.

### `operations`

The `operations` property is an array, each item containing one or more steps.
You can have as many operations as you need for naming snaps or grouping steps.
Each array item is a JSON schema with the following properties:

- `skip`: `true` or `false`. (Optional) Set to `true` to skip this operation.

- `name`: String. (Optional) A name for this operation. Included in the image path or filename. Can contain slashes and works the same way as `pages.name`.

- `viewport`: A viewport for this operation. Each operation can have its own viewport, which overrides the page's or default viewport for the scope of the operation. Same as `pages.viewport`.

- `loop`: Integer. (Optional) Repeat this operation's steps `loop` times. (Default is 1.) If `loop` is greater than 1, the loop number (with 0 as the first loop) is appended to any saved images.

- `steps`: An array of individual steps. See [`steps`](#steps).

### `steps`

A `step` represents the actual action to be performed. Each is a JSON schema with the following properties:

- `locator`: The selector locator type, one of the following:

  - `css`: `selector` is a CSS string.

  - `getbytext`: `selector` is a string.

  - `getbyrole`: `selector` is an element's role name string.

  - `placeholder`: `selector` is an element's placeholder string.

  - `label`: `selector` is an element's label.

  If no locator is set, `selector` is ignored and defaults to the whole page.

- `name`: String or empty. A name for this step. Included in image filename.

- `selector`: A selector in the style of `locator`.

    > Selectors and Locators are an important topic, and key to working with Playwright and this program. Read more at [Playwright locators](https://playwright.dev/docs/locators).

- `skip`: `true` or `false`. (Optional) Set to `true` to skip this step.

- `type`: Type of step. See [Step Types](#step-types).

- `value`: String values for `edit`, `replace`, `style`, and `text` step types, an array of string values for `press` step type, and an integer for the `wait` step type (the wait time in milliseconds).

- `viewport`: Each step can specify its own viewport which overrides the current one (the default, the operation, or page level viewport). (See also `pages.viewport` and `operations.viewport`.)

- `options`: Options for the `snap` step. (These are passed directly to Playwright's [screenshot](https://playwright.dev/docs/api/class-page#page-screenshot) call, which `snap` wraps around. In theory, you could use any options, not just the `clip` as described here.)

  - `clip`: For full page snaps (no selector specified), snap only the region specified by the coordinates. See <https://playwright.dev/docs/api/class-page#page-screenshot-option-clip>

    Example: to snap a region 50x380 pixels in size, starting at coordinates 15,160 (from top left of the browser pane), use this step:

    ```json
    ...
    {
        "name": "Cropped Snap",
        "type": "snap",
        "options": {
            "clip": {
                "x": 15,
                "y": 160,
                "height": 50,
                "width": 380
            }
        }
    },
    ...
    ```

#### Step Types

Steps are where the browser acts via a Playwright function. (The Playwright calls are given after each description.)

- `ask`: Prompts you (with `>`) for a value to be inserted into the text field specified by `selector`. (`page.fill()`)

- `back`: Return to the previous page. (`page.goBack()`)

- `click`: Click the element specified by `selector`. (`page.click()`)

- `dblclick`: Double-click the element specified by `selector`. (`page.dblclick()`)

- `edit`: Change the text content of the element specified by `selector`. (See also `replace`.) (`page.evaluate()` on `node.innerText`)

- `focus`: Focus on the element specified by `selector`. (`page.focus()`)

- `move`: Move to (hover over) the first match for the element specified by `selector` and positions the mouse in the center of it. (`page.hover()`)

- `press`: Press each of the keys in the `value` array, waiting `instance.<instance name>.pause` microseconds between each press. (`page.press()`)

  Example: a step to press enter (or return), followed by a step to type "None" and then press enter:

  ```json
  ...
  {
    "name": "Press Enter",
    "type": "press",
    "value": [
        "Enter"
    ]
  },
  {
    "name": "Type word and Enter",
    "type": "press",
    "value": [
        "N",
        "o",
        "n",
        "e",
        "Enter"
    ]
  },
  ...
  ```

- `quit`: Immediately stop running the program. The browser is closed and the process is exited.

- `replace`: Change the HTML content of `selector`. (See also `edit`.) (`page.evaluate()` on `node.innerHTML`)

- `snap`: Make a screenshot of the window or element. If `selector` is set, only snap the element specified by it. (`page.screenshot()`)

- `style`: Insert the CSS code provided by the `value` field. Useful for blurring text, adding border highlights, or anything else you can do with CSS styles. (`page.addStyleTag()`)

  Example: blur an email address in a menu element:

  ```json
  ...
  {
      "name": "blur email",
      "type": "style",
      "value": "#menu > div > div.account > button > span { ); }"
  },
  ...
  ```

- `text`: Enter `value` text into element `selector`.

  If `value` contains the text `RANDOM`, the word is replaced with a random hexadecimal string. The length of the string is the value for `settings.randlen`.

  If `value` contains the text `USER`, the text is replaced with the contents of the file specified by `instance.<instance name>.user_filename`.

  If `value` contains the text `LOGIN`, the text is replaced with the contents of the file specified by `instance.<instance name>.login_filename`.

  If `value` contains the text `PASSWORD`, the text is replaced with the contents of the file specified by `instance.<instance name>.password_filename`. (`page.fill()`)

- `wait`: If `selector` is specified, wait for it to become visible. Otherwise, wait for the step's `value` in milliseconds. This is in addition to the default `instance.<instance name>.wait` and `instance.<instance name>.pause` values. Useful when some page contents take time to load fully, even if the browser has finished loading the page. (`page.inVisible()` or `page.waitForTimeout()`)

## How it works

`main.js` loops through `pages` (URLs) entries in the configuration file, processing each page, its operations and steps, one by one. If an operation has a `loop` value, that operation's steps are repeated that number of times. If a snap happens within a loop, a loop number suffix is added to the image filename.

The basic structure of a pages configuration file is:

``` example
One or more pages
  Zero or more operations
    One or more steps
```

A page can be specified more than once. This is useful if the same page needs to be snapped with a different sized browser window, or there are individual components (such as menus, buttons, specific panels) to be snapped separately as well as the whole window.

You can specify one or more operations to define what should happen prior to a snap. For example, you can hover over something to reveal a tooltip, select an item in a list, enter text into a field, or go through the step-by-step process of adding, editing and deleting something. You can snap the whole window or an HTML element as specified by its CSS or XPath selector, or by its role or text label (the step's `locator` value determines which).

An operation is a named group of steps within the same page. Operations are useful for grouping steps into a unit, and saving the images to a common directory or prefix.

If no operations are specified, a page entry causes a single full-window snap. If operations are specified, you must explicitly snap the window or its elements.

Look at the supplied configuration files for ways to use these.

### Page URLs

The URL for a page is made by concatenating the following:

- `instance.<instance name>.server`
- `a` to `f` (if set)
- `uid`

If `url` is set, `uid` is ignored and the URL is made by concatenating the following:

- `instance.<instance name>.server`
- `url`

If there is an `options` array, they are concatenated and appended to the URL.

### Image File Names

The image path is a concatenation of the following parts:

- `settings.dir`: The base directory.

- (If `settings.timestamp` is `true`) The current date-time, in the format `YYYYMMDD_HHmmss`.

- `instance.<instance name>`: The instance name used for the run.

- (If `settings.seq` is `true`): A zero-padded integer, incremented for each saved image, separated from the next file name element with the character in `settings.sep`.

- (If `settings.pfx` is non-empty): The value, separated from the next file name element with the character in `settings.sep`.

- Concatenation of non-empty values for page `name`, operation `name`, and step `name`. Page and operation names can contain and end with path separator characters to create subdirectories. (See `cfg/jitterbit.edi.json` for examples.)

- `settings.ext`: The file name suffix, which also determines the image file type.

After this concatenation, the full path is separated into the directory part (`dirname`) and the file name (`basename`).

The dirname is left alone.

For the basename, dots, spaces, and back slashes are replaced with the character in `settings.sep`.

If `--full` option is given, any `snap` type steps occur twice, once as specified, and once using the `instance.<instance name>.container` element. This snap's file name is suffixed with `_full`.

## Tips

- If you see blank pages, increase the value for `instance.<instance name>.wait`. This is how long to wait after a page has loaded.

- To see what's going on, set `settings.headless` to true, to turn off headless mode, or create a `webm` format video recording with `settings.video`.

- While developing a long sequence of snaps, use `"skip": true` and `"type": "quit"` to skip pages, operations, and steps, or exit immediately. You can also turn on image sequence numbers with `settings.seq` and add run datetime stamps to the image directory with `settings.timestamp`.

[Percona]: https://www.percona.com/
[Percona Monitoring and Management]: https://www.percona.com/software/database-tools/percona-monitoring-and-management
[PMM Demo]: https://pmmdemo.percona.com
[Jitterbit]: https://www.jitterbit.com/
[Harmony]: https://www.jitterbit.com/harmony/

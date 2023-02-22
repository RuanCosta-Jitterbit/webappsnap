// Connects to app to take screenshots of each page defined in config
'use strict';
const { chromium, firefox, webkit } = require('playwright');
const { argv } = require('yargs');
const path = require('path');
const util = require('./util.js'); // Utility functions: snapping, loading URLs
const config = require('./config.js'); // Start-up vs default configuration value handling
const { exit } = require('process');
const { randomBytes } = require('node:crypto');
const fs = require('fs')
const defaults = config.defaults; // Default config values
const pages = config.pages; // Page definitions
const img_ext = config.img_ext;   // Image file extension (png/jpg)
const server_cfg = config.server_cfg; // Config file specific to an app
const prompt = require('prompt-sync')(); // Get input

if (argv.list) { // List page UIDs and exit
    console.log(Array.from(new Set(pages.map(e1 => e1.uid).sort())).join("\n"));
    return;
}

// Images save path
var img_dir = path.join(config.img_dir, server_cfg.name);

util.mkdir(img_dir);    // Create image save directory TODO move to snap function

// Option for specifying pages to snap
const selected_pages = ((argv.uid) ? argv.uid.split(',') : []);

// TODO Better debug/logging/usage options
if (argv.debug) { config.debug = argv.debug; }

(async () => {
    if (config.debug) {
        console.log(`Server: ${config.hostname}`);
        console.log("Files");
        console.log(`  Image base directory (SNAP_IMG_DIR): ${img_dir}`)
        console.log(`  Defaults file (SNAP_DEFAULTS_FILE): ${config.defaults_file_name}`);
        console.log(`  Server configuration file (SNAP_SRV_CFG_FILE): ${config.cfg_file_name}`);
        console.log(`  Pages configuration file (SNAP_PAGES_FILE): ${config.pages_file_name}`);
        console.log("Images");
        console.log(`  Viewport (SNAP_IMG_WIDTH x SNAP_IMG_HEIGHT): ${config.img_width}x${config.img_height}`);
        console.log(`  Image filename sequence numbers (SNAP_IMG_SEQ): ${Boolean(config.img_seq)}`);
        console.log(`  Image filename prefix (SNAP_IMG_PFX): ${config.img_pfx}`);
        console.log(`  Image filename suffix (SNAP_IMG_EXT): ${config.img_ext}`);
        if (img_ext.match(/\.jpg$/)) { console.log(`  JPG quality (SNAP_JPG_QUALITY): ${config.jpg_quality}`); }
        console.log("Waits");
        console.log(`  Default page load wait: ${server_cfg.wait / 1000} seconds`);
        console.log(`  Default page settle: ${server_cfg.pause / 1000} ${Math.floor(server_cfg.pause / 1000) == 1 ? "second" : "seconds"}`);
        console.log(`  SlowMo value (SNAP_SLOW_MO): ${config.slowmo / 1000} seconds`);
        console.log("Options");
        console.log(`  Headless mode (SNAP_HEADLESS): ${Boolean(config.headless)}`);
        console.log(`  Snap container panels beyond viewport (--full): ${Boolean(argv.full)}`); // TODO make env var
        if (!argv.uid) { console.log("  Snapping all pages"); }
        else { console.log(`  Snapping selected (--uid): ${selected_pages.join(' ')}`); }
    }

    // TODO User select browser type: chromium, firefox, webkit
//    const browser = await chromium.launch({
    const browser = await chromium.launch({
        headless: config.headless,
        slowMo: config.slowmo
    });

    var page = await browser.newPage({ ignoreHTTPSErrors: true });
    page.setDefaultTimeout(server_cfg.wait);
    util.viewport(page, {
        width: config.img_width,
        height: config.img_height
    });

    /*************************************************************************************
     * A loop through all pages in pages config file (e.g. ./cfg/pages.json):
     *
     * Part 1: Build URL
     * Part 2: Define viewport
     * Part 3: Load the page
     * Part 4: If no operations, snap the viewport and optionally (--full) unconstrained container
     * Part 5: If operations/steps, process them sequentially
     */

    // Can specify up to  custom page prefixes
    const server_url_prefixes = [
        server_cfg.a ? server_cfg.a : null,
        server_cfg.b ? server_cfg.b : null,
        server_cfg.c ? server_cfg.c : null,
        server_cfg.d ? server_cfg.d : null,
        server_cfg.e ? server_cfg.e : null,
        server_cfg.f ? server_cfg.f : null
    ];

    for (var d in pages) {
        var pg = pages[d]; // convenience handle

        if (selected_pages.length > 0 && !selected_pages.includes(pg.uid)) {
            continue;
        }

        // Pages, operations, and steps can be skipped with "skip": true
        console.log(`Page ${d}: ${pg.comment}`);
        if (pg.skip) {
            console.log(`  SKIPPED`);
            continue;
        }

        page.setDefaultTimeout(server_cfg.wait);
        const wait = (pg.wait ? pg.wait : server_cfg.wait); // Per-page waits override the default

        // PART 1 - Build URL
        // TODO Need a way to configure app page URL patterns
        // Create option string if needed
        var server_url;
        var option_string = "";
        if (pg.options) { option_string = "?" + pg.options.join('&'); }

        // Construct the page's URL or use the override value
        if (pg.url) {
            server_url = [
                server_cfg.server
                , pg.url
            ].join(path.sep);
        } else {
            server_url =
                [
                    server_cfg.server
                    // filter as not all prefixes may be set
                    , server_url_prefixes.filter(x => typeof x === 'string' && x.length > 0).join(path.sep)
                    , pg.uid
                ]
                    .join(path.sep);
        }
        server_url = `${server_url}${option_string}`

        // PART 2 - Viewport
        // Default when none specified
        const default_page_viewport = { width: config.img_width, height: config.img_height };
        // Used to reset after loop
        var page_viewport = default_page_viewport;
        var operation_viewport = default_page_viewport;

        // PART 3 - Load URL
        await util.load(page, server_url, wait, true);

        if (pg.viewport) {
//            console.log(`  Viewport ${pg.viewport.width}x${pg.viewport.height} for dashboard`);
            await util.viewport(page, pg.viewport);
            page_viewport = pg.viewport;
        }

        // TODO Reliable way of knowing when page has completed loading

        // PART 4 - Dashboard-level snap (no operations)
        if (!pg.operations) {
            await util.snap(page, pg.title, img_dir);

            // Snap container without cropping at viewport
            // Skip any using 'url' element
            if (argv.full && !pg.url) {
                try {
                    // Get height of container
                    const elem = await page.waitForSelector(defaults.container, { visible: true });
                    const bx = await elem.boundingBox();
                    // Resize viewport to container height plus padding
                    const vp = { width: config.img_width, height: bx.height + 150 };
                    await util.viewport(page, vp, true);
                    await util.snap(page, pg.title + "_full", img_dir, true);
                }
                catch (e) {
                    console.log(`  ${e}...Skipping full snap`);
                }
            }
        }

        // PART 5 - Operations - Any number of groups of steps, each step being an array of one of:
        // - back: return to previous page
        // - wait: explicitly wait for the specified value (in ms);
        // - move: move to (hover over) a selector;
        // - text: enter text into the selector;
        // - press: press keys listed in array;
        // - click: click the selector;
        // - style: inject css style;
        // - snap: Explicitly snap the the specified selector or the whole viewport.
        // With no operations, a dashboard is automatically snapped.
        // If operations are used, dedicate at least one step to a full-window snap,
        // or add another dashboard entry with no operations.
        for (var o in pg.operations) {
            var op = pg.operations[o]; // Convenience handle
            console.log(`  Operation: ${o}: ${op.name}`);
            if (op.skip) {
                console.log("    SKIPPED");
                continue;
            }

            // Repeat operations if loop is set
            var loop = (op.loop > 1) ? op.loop : 1;
            if (loop > 1) { console.log(`    Operation loop count: ${loop}`); }

            for (let n = 0; n < loop; n++) {
                console.log(`    Operation loop: ${n+1} of ${loop}`);

                // Viewport per operation
                if (op.viewport) {
//                    console.log(`    Viewport for operation: ${op.viewport.width}x${op.viewport.height}`);
                    await util.viewport(page, op.viewport);
                    operation_viewport = op.viewport;
                }

                for (var s in op.steps) {
                    var step = op.steps[s]; // Convenience handle
                    console.log(`    Step ${s}: ${step.type} (${step.name}) - Selector (${step.locator}): ${step.selector} - Value: ${step.value}`);

                    if (step.skip) {
                        console.log("      SKIPPED");
                        continue;
                    }

                    // Use locators of various types.
                    // https://playwright.dev/docs/locators
                    var loc;
                    switch (step.locator) {
                        case "css":
                            loc = page.locator(step.selector);
                            break;
                        case "label":
                            loc = page.getByLabel(step.selector);
                            break;
                        case "placeholder":
                            loc = page.getByPlaceholder(step.selector);
                            break;
                        case "getbytext":
                            loc = page.getByText(step.selector, { exact: true }).first(); // Usually
                            break;
                        case "getbyrole":
                            loc = page.getByRole(step.selector);
                            break;
                        default:
                            loc = page;
                            break;
                    }

                    try {
                        await page.waitForTimeout(server_cfg.pause);
                        switch (step.type) {
                            // Flow control
                            case "quit":
                                browser.close();
                                process.exit(0);
                                break; // fwiw

                            // User Input
                            case "click":
                                await loc.click();
                                break;

                            case "text":
                                var value = step.value;
                                // Process special tokens
                                value = value.replace("RANDOM", randomBytes(defaults.randlen).toString('hex'));
                                if (value == "LOGIN") {
                                    value = fs.readFileSync(server_cfg.login_filename, 'utf8');
                                }
                                if (value == "PASSWORD") {
                                    value = fs.readFileSync(server_cfg.password_filename, 'utf8');
                                }
//                                console.log(`      Value: ${value}`);
                                await loc.fill(String(value));
                                break;

                            case "press":
                                for (var k in step.value) {
                                    var key = String(step.value[k]);
//                                    console.log(`      Pressing: ${key}`);
                                    await page.press('body', key);
                                    await page.waitForTimeout(server_cfg.pause);
                                }
                                break;

                            //  Movement
                            case "move":
                                await loc.hover();
                                break;

                            case "focus":
                                await loc.focus();
                                break;

                            case "back":
                                await page.goBack();
                                break;

                            case "ask":
                                var value = prompt('Enter Value: ');
                                await loc.fill(String(value));
                                break;

                            case "wait":
                                if (step.selector) {
                                    await loc.isVisible();
                                } else {
                                    await page.waitForTimeout(step.value);
                                }
                                break;

                            // Actions
                            case "style":
                                await page.addStyleTag({ content: step.value });
                                break;

                            case "snap":
                                // Viewport per step
                                if (step.viewport) {
//                                    console.log(`      Viewport for step: ${step.viewport.width}x${step.viewport.height}`);
                                    await util.viewport(page, step.viewport);
                                }
                                // If selector defined, snap only it, otherwise snap page
//                                console.log(`      Viewport for snap: ${await page.viewportSize().width}x${await page.viewportSize().height}`);
                                //                                var selector = (step.selector) ? await page.waitForSelector(step.selector, { visible: true }) : page;
//                                process.stdout.write("    "); // Indent log message in snap function

                                //TODO add/remove border
                                //                                await page.addStyleTag({ content: `${selector} { border-style: solid; }` });
                                await util.snap(loc, [pg.title, op.name, step.name, n].filter(String).join(config.img_filename_sep), img_dir);
                                //                                await page.addStyleTag({ content: `${selector} { border-style: none; }` });

                                await util.viewport(page, operation_viewport); // Reset to operation viewport
//                                console.log(`    Viewport reset to operation level: ${operation_viewport.width}x${operation_viewport.height}`);
                                break;

                            default:
                                console.log(`    Skipping: Step type '${step.type}' not recognized`);
                                break;
                        }
                    } catch (e) {
                        console.log(`Skipping: ${e}`);
                    }
                } // for step
//                console.log(`    Viewport reset to page level: ${page_viewport.width}x${page_viewport.height}`);
                await util.viewport(page, page_viewport); // Reset to page viewport
            }
        } // for operations
//        console.log(`    Viewport reset to default: ${default_page_viewport.width}x${default_page_viewport.height}`);
        await util.viewport(page, default_page_viewport); // Reset to default viewport
    } // for pages
    await browser.close();
})();

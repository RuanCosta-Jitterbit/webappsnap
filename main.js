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
//const defaults = config.defaults; // Default config values
const pages = config.pages; // Page definitions
const img_ext = config.img_ext;   // Image file extension (png/jpg)
const server_cfg = config.server_cfg; // Config file specific to an app
const prompt = require('prompt-sync')(); // Get input

if (argv.list) { // List page UIDs and exit
    console.log(Array.from(new Set(pages.map(e1 => e1.uid).sort())).join("\n"));
    return;
}

// Default viewport
var default_vp = { width: config.img_width, height: config.img_height };

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
        console.log(`  Default viewport (SNAP_IMG_WIDTH x SNAP_IMG_HEIGHT): ${default_vp.img_width}x${default_vp.img_height}`);
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
    //    const browser = await firefox.launch({
    const browser = await chromium.launch({
        headless: config.headless,
        slowMo: config.slowmo
    });

    //    var page = await browser.newPage({ ignoreHTTPSErrors: true });
    const context = await browser.newContext({
        deviceScaleFactor: 2,
        viewport: {
            width: default_vp.width,
            height: default_vp.height
        },
        screen: {
            width: 4112,
            height: 2658
        },
        recordVideo: {
            dir: img_dir,
            size: {
                width: default_vp.width,
                height: default_vp.height
            }
        }
    });
    var page = await context.newPage({
        deviceScaleFactor: 2
    });

    //    page.setDefaultTimeout(server_cfg.wait);
    /*
        util.viewport(page, {
            width: default_vp.width,
            height: default_vp.height
        });
    */
    /*************************************************************************************
     * A loop through all pages in pages config file (e.g. ./cfg/pages.json):
     *
     * Part 1: Build URL
     * Part 2: Define viewport
     * Part 3: Load the page
     * Part 4: If no operations, snap the viewport and optionally (--full) unconstrained container
     * Part 5: If operations/steps, process them sequentially
     */

    // Can specify up to 6 custom page prefixes
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

        // Pages, operations, and steps can use "skip": true
        if (pg.skip) {
            console.log(`Page ${d} - SKIPPED: ${pg.name} (${pg.comment})`);
            continue;
        }
        console.log(`Page ${d}: ${pg.name} (${pg.comment})`);

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
                ].join(path.sep);
            if (pg.uid) {
                server_url = [server_url, pg.uid].join(path.sep);
            }
        }
        server_url = `${server_url}${option_string}`

        // PART 3 - Load URL
        await util.load(page, server_url, wait, true);

        // Per-page viewport
        const current_page_vp = page.viewportSize();
        if (pg.viewport) {
            console.log(`  Viewport for page: ${pg.viewport.width}x${pg.viewport.height}`);
            await util.viewport(page, pg.viewport, true);
        }

        // TODO Reliable way of knowing when page has completed loading

        // PART 4 - Page-level snap (no operations)
        if (!pg.operations) {
            await util.snap(page, pg.name, img_dir, pg.options);

            // Snap container without cropping at viewport
            // Skip any using 'url' element
            if (argv.full && !pg.url) {
                try {
                    // Get height of container
                    // TODO container not here
                    const elem = await page.waitForSelector(defaults.container, { visible: true });
                    const bx = await elem.boundingBox();
                    // Resize viewport to container height plus padding
                    const vp = { width: config.img_width, height: bx.height + 150 };
                    await util.viewport(page, vp, true);
                    await util.snap(page, pg.name + "_full", img_dir, pg.options);
                }
                catch (e) {
                    console.log(`  ERROR ${e}`);
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
            if (op.skip) {
                console.log(`  Operation ${o} - SKIPPED: ${op.name} (${op.comment})`);
                continue;
            }
            console.log(`  Operation ${o}: ${op.name} (${op.comment})`);

            // Repeat operations if loop is set
            var loop = (op.loop > 1) ? op.loop : 1;
            if (loop > 1) { console.log(`    Operation loop count: ${loop}`); }

            for (let n = 0; n < loop; n++) {
                console.log(`    Operation loop: ${n + 1} of ${loop}`);

                // Per-operation viewport
                const current_operation_vp = page.viewportSize();
                if (op.viewport) {
                    console.log(`    Viewport for operation: ${op.viewport.width}x${op.viewport.height}`);
                    await util.viewport(page, op.viewport, true);
                }

                for (var s in op.steps) {
                    var step = op.steps[s]; // Convenience handle
                    if (step.skip) {
                        console.log(`      Step ${s} - SKIPPED: ${step.type} - ${step.name} (${step.comment})`);
                        continue;
                    }
                    console.log(`      Step ${s}: ${step.type} - ${step.name} - Selector (${step.locator}): ${step.selector} - Value: ${step.value} (${step.comment})`);

                    // Viewport per step
                    const current_step_vp = page.viewportSize();
                    if (step.viewport) {
                        console.log(`        Viewport for step: ${step.viewport.width}x${step.viewport.height}`);
                        await util.viewport(page, step.viewport);
                    }

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
                            var options = { exact: true };
                            if (step.options) {
                                options = step.options;
                            }
                            loc = page.getByText(step.selector, options).first(); // Usually
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

                            case "dblclick":
                                await loc.dblclick();
                                break;

                            case "text":
                                var value = step.value;
                                // Process special tokens
                                value = value.replace("RANDOM", randomBytes(config.randlen).toString('hex'));
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
                                var value = prompt('> ');
                                if (value) {
                                    await loc.fill(String(value));
                                }
                                break;

                            case "wait":
                                if (step.selector) {
                                    await loc.isVisible();
                                } else {
                                    await page.waitForTimeout(step.value);
                                }
                                break;

                            // Actions
                            case "edit":
                                const ve = String(step.value);
                                await loc.evaluate((node, ve) => node.innerText = ve, ve);
                                break;

                            case "replace":
                                const vr = String(step.value);
                                await loc.evaluate((node, vr) => node = vr, vr);
                                break;

                            case "style":
                                await page.addStyleTag({ content: step.value });
                                break;

                            case "snap":
                                var fn = [pg.name, op.name, step.name].filter(String).join(config.img_filename_sep);
                                if (op.loop) { [fn, n].join(config.img_filename_sep); }
                                await util.snap(loc, fn, img_dir, step.options);
                                break;

                            default:
                                console.log(`      Step type '${step.type}' not recognized`);
                                break;
                        }
                    } catch (e) {
                        console.log(`ERROR: ${e}`);
                    }
                    if (step.viewport) {
                        console.log(`        Reset viewport for step: ${current_step_vp.width}x${current_step_vp.height}`);
                        await util.viewport(page, current_step_vp);
                    }
                } // for step
                if (op.viewport) {
                    console.log(`    Reset viewport for operation: ${current_operation_vp.width}x${current_operation_vp.height}`);
                    await util.viewport(page, current_operation_vp);
                }
            } // operations loop
        } // for operations
        if (pg.viewport) {
            console.log(`  Reset viewport for page: ${current_page_vp.width}x${current_page_vp.height}`);
            await util.viewport(page, current_page_vp);
        }
    } // for pages
    await context.close();
    await browser.close();
})();

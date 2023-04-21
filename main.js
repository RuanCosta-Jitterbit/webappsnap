// Connects to app to take screenshots of each page defined in config
'use strict';
const { chromium, firefox, webkit } = require('playwright');
const { argv } = require('yargs');
const uf = require('url');
const path = require('path');
const { randomBytes } = require('node:crypto');
const fs = require('fs');
//const axios = require('axios')
const prompt = require('prompt-sync')(); // Get input
//const util = require('./js'); // Utility functions: snapping, loading URLs

if (!argv.config) {
    console.log("Missing config file (--config=)");
    return;
}
if (!argv.instance) {
    console.log("Missing instance name (--instance=)");
    return;
}
// TODO check instance exists in config

(async () => {
    const config = require(argv.config);
    const settings = config.settings; // General snap config
    const pages = config.pages; // Page definitions
    const instance = config.instance[argv.instance];
    const hostname = uf.parse(instance.server).hostname; // The app URL/server/IP
    const default_viewport = {
        width: settings.img_width,
        height: settings.img_height
    };
    const today = new Date().toISOString();
    const img_dir = path.join(settings.img_dir, today, argv.instance); // Images save path
    const img_ext = settings.img_ext;   // Image file extension (png/jpg)
    mkdir(img_dir);    // Create image save directory TODO move to snap function

    if (settings.debug) {
        console.log(`Hostname: ${hostname}`);
        console.log(`Image directory: ${img_dir}`)
        console.log(`Default viewport: ${default_viewport.width}x${default_viewport.height}`);
        console.log(`Image filename sequence numbers: ${Boolean(settings.img_seq)}`);
        console.log(`Image filename prefix: ${settings.img_pfx}`);
        console.log(`Image filename suffix: ${settings.img_ext}`);
        if (img_ext.match(/\.jpg$/)) { console.log(`  JPG quality: ${settings.jpg_quality}`); }
        console.log(`Default page load wait: ${instance.wait / 1000} seconds`);
        console.log(`Default page settle: ${instance.pause / 1000} ${Math.floor(instance.pause / 1000) == 1 ? "second" : "seconds"}`);
        console.log(`SlowMo value: ${settings.slowmo / 1000} seconds`);
        console.log(`Headless mode: ${Boolean(settings.headless)}`);
        console.log(`Snap container panels beyond viewport (--full): ${Boolean(argv.full)}`);
    }

    // TODO User select browser type: chromium, firefox, webkit
    //    const browser = await firefox.launch({
    const browser = await chromium.launch({
        headless: settings.headless,
        slowMo: settings.slowmo
    });

    //    var page = await browser.newPage({ ignoreHTTPSErrors: true });
    const context = await browser.newContext({
        deviceScaleFactor: 2,
        viewport: default_viewport
/*
        screen: {
            width: 4112,
            height: 2658
        },
        */
       /*
        recordVideo: {
            dir: img_dir,
            size: default_viewport
        }
        */
    });
    var page = await context.newPage({
        deviceScaleFactor: 2
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

    // Can specify up to 6 custom page prefixes
    const server_url_prefixes = [
        instance.a ? instance.a : null,
        instance.b ? instance.b : null,
        instance.c ? instance.c : null,
        instance.d ? instance.d : null,
        instance.e ? instance.e : null,
        instance.f ? instance.f : null
    ];

    for (var d in pages) {
        var pg = pages[d]; // convenience handle

        // Pages, operations, and steps can use "skip": true
        if (pg.skip) {
            console.log(`Page ${d}: SKIP - ${pg.name} (${pg.comment})`);
            continue;
        }
        console.log(`Page ${d}: ${pg.name} (${pg.comment})`);

        page.setDefaultTimeout(instance.wait);
        const wait = (pg.wait ? pg.wait : instance.wait); // Per-page waits override the default

        // PART 1 - Build URL
        // TODO Need a way to configure app page URL patterns
        // Create option string if needed
        var server_url;
        var option_string = "";
        if (pg.options) { option_string = "?" + pg.options.join('&'); }

        // Construct the page's URL or use the override value
        if (pg.url) {
            server_url = [
                instance.server
                , pg.url
            ].join(path.sep);
        } else {
            server_url =
                [
                    instance.server
                    // filter as not all prefixes may be set
                    , server_url_prefixes.filter(x => typeof x === 'string' && x.length > 0).join(path.sep)
                ].join(path.sep);
            if (pg.uid) {
                server_url = [server_url, pg.uid].join(path.sep);
            }
        }
        server_url = `${server_url}${option_string}`

        // PART 3 - Load URL
        await load(page, server_url, wait, true);

        // Per-page viewport
        const current_page_vp = page.viewportSize();
        if (pg.viewport) {
            console.log(`  Viewport for page: ${pg.viewport.width}x${pg.viewport.height}`);
            await viewport(page, pg.viewport, true);
        }

        // TODO Reliable way of knowing when page has completed loading

        // PART 4 - Page-level snap (no operations)
        if (!pg.operations) {
            await snap(page, pg.name, img_dir, pg.options, settings);

            // Snap container without cropping at viewport
            // Skip any using 'url' element
            if (argv.full && !pg.url) {
                try {
                    // Get height of container
                    // TODO container not here
                    const elem = await page.waitForSelector(defaults.container, { visible: true });
                    const bx = await elem.boundingBox();
                    // Resize viewport to container height plus padding
                    const vp = { width: settings.img_width, height: bx.height + 150 };
                    await viewport(page, vp, true);
                    await snap(page, pg.name + "_full", img_dir, pg.options, settings);
                }
                catch (e) {
                    console.log(`  ERROR ${e}`);
                }
            }
        }

        // PART 5 - Operations - Any number of groups of steps
        // With no operations, a dashboard is automatically snapped.
        // If operations are used, dedicate at least one step to a full-window snap,
        // or add another dashboard entry with no operations.
        for (var o in pg.operations) {
            var op = pg.operations[o]; // Convenience handle
            if (op.skip) {
                console.log(`  Operation ${o}: SKIP - ${op.name} (${op.comment})`);
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
                    await viewport(page, op.viewport, true);
                }

                for (var s in op.steps) {
                    var step = op.steps[s]; // Convenience handle
                    if (step.skip) {
                        console.log(`      Step ${s}: SKIP - ${step.type} - ${step.name} (${step.comment})`);
                        continue;
                    }
                    console.log(`      Step ${s}: ${step.type} - ${step.name} - Selector (${step.locator}): ${step.selector} - Value: ${step.value} (${step.comment})`);

                    // Viewport per step
                    const current_step_vp = page.viewportSize();
                    if (step.viewport) {
                        console.log(`        Viewport for step: ${step.viewport.width}x${step.viewport.height}`);
                        await viewport(page, step.viewport);
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
                            let opts = {};
                            if (step.options) {
                                opts = step.options;
                            }
                            opts.exact = true;
                            loc = page.getByText(step.selector, opts).first(); // Usually
                            break;

                        case "getbyrole":
                            loc = page.getByRole(step.selector);
                            break;

                        default:
                            loc = page;
                            break;
                    }

                    try {
                        await page.waitForTimeout(instance.pause);

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
                                value = value.replace("RANDOM", randomBytes(settings.randlen).toString('hex'));
                                if (value == "LOGIN") {
                                    value = fs.readFileSync(instance.login_filename, 'utf8');
                                }
                                if (value == "PASSWORD") {
                                    value = fs.readFileSync(instance.password_filename, 'utf8');
                                }
                                //                                console.log(`      Value: ${value}`);
                                await loc.fill(String(value));
                                break;

                            case "press":
                                for (var k in step.value) {
                                    var key = String(step.value[k]);
                                    //                                    console.log(`      Pressing: ${key}`);
                                    await page.press('body', key);
                                    await page.waitForTimeout(instance.pause);
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
                                // build image file name from whatever "name" elements have values, separated by the sep char
                                let fn = [pg.name, op.name, step.name].filter(String).join(settings.img_filename_sep);
                                if (op.loop) { [fn, n].join(settings.img_filename_sep); }
                                await snap(loc, fn, img_dir, step.options, settings);
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
                        await viewport(page, current_step_vp);
                    }
                } // for step
                if (op.viewport) {
                    console.log(`    Reset viewport for operation: ${current_operation_vp.width}x${current_operation_vp.height}`);
                    await viewport(page, current_operation_vp);
                }
            } // operations loop
        } // for operations
        if (pg.viewport) {
            console.log(`  Reset viewport for page: ${current_page_vp.width}x${current_page_vp.height}`);
            await viewport(page, current_page_vp);
        }
    } // for pages
    await context.close();
    await browser.close();
})();

/*
** Convenience wrapper for screenshots, and where the image filename is built.
** Note, 'page' might be a locator.
*/
// Increment screenshot file names
var idx = 1;
async function snap(page, title, dir, options = {}, settings) {
    let sep = settings.img_filename_sep;

    // Replace space, dot, slash with sep char
    title = title.replace(/[\. \\\/]/g, sep);

    // Array of two (possibly empty) prefixes joined with title and extension
    let filename = [
        (settings.img_seq ? pad(idx++) : null),
        (settings.img_pfx ? settings.img_pfx : null),
        title
    ].filter(function (a) { return a != null; }).join(sep) + settings.img_ext;

    let filepath = path.join(dir, filename);

//    options.omitBackground = true;
    options.path = filepath;
    if (settings.img_ext == '.jpg') {
        options.type = 'jpeg';
        options.quality = settings.jpg_quality;
    }

    try {
        await page.screenshot(options);
    } catch (err) {
        console.error(`Failed to save image ${err}`);
    }
}

/*
** Zero-pad filename increment integer
*/
function pad(n, w = 3, z = '0') { // number, width, padding char
    n = String(n);
    return n.length >= w ? n : new Array(w - n.length + 1).join(z) + n;
}

/*
** Convenience wrapper for loading pages with logging and standard load wait time
*/
async function load(page, url, wait = instance.wait, force_wait = false) {
    try {
        console.log(`  Loading ${url} (timeout ${wait / 1000} ${Math.floor(wait / 1000) == 1 ? "second" : "seconds"})`);

        await page.goto(url,
            {
//                waitUntil: 'networkidle',
                timeout: wait
            }
        );
        if (force_wait) {
            await page.waitForTimeout(wait); // Force Wait before snap
        }
    } catch (e) {
        console.error(`Can't load ${url} - skipping (${e})`);
    }
    // TODO handle net::ERR_INTERNET_DISCONNECTED
}

/*
** Convenience viewport setter (with reload option)
*/
async function viewport(page, viewport, reload = false) {
    try {
        await page.setViewportSize({
            width: viewport.width,
            height: viewport.height
        });
        if (reload) { // some pages need reloading after the viewport is changed
            console.log(`Reloading (timeout=${instance.wait / 1000})`);
            await page.reload({
                waitUntil: 'load',
                timeout: instance.wait
            });
        }
    } catch (e) {
        console.error(`Failed setting viewport - ${e}`);
    }
}

/*
** Create images directories
*/
function mkdir(dir) {
    if (!fs.existsSync(dir)) {
        try {
            console.log("Creating image save directory: " + dir);
            fs.mkdirSync(dir, { recursive: true });
        }
        catch (err) {
            console.error("Failed to create image save directory " + dir);
            return;
        }
    } else {
        console.log("Image save directory: " + dir + " (already exists)");
    }
}
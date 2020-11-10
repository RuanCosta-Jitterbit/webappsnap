// Connects to PMM instance to take screenshots of each dashboard
'use strict';
const puppeteer = require('puppeteer');
const { argv } = require('yargs');
const path = require('path');
const util = require('./util.js'); // Utility functions: snapping, loading URLs
const config = require('./config.js'); // Start-up vs default configuration value handling
const defaults = config.defaults; // Default config values
const dashboards = config.dashboards; // Dashboards definitions
const img_ext = config.img_ext;   // Image file extension (png/jpg)
const server_cfg = config.server_cfg; // Config file specific to a PMM server

if (argv.list) { // List dashboard UIDs and exit
    console.log(Array.from(new Set(dashboards.map(e1 => e1.uid).sort())).join("\n"));
    return;
}



// Images save path
var img_dir = path.join(config.img_dir, server_cfg.name,
    `${String(config.img_width)}x${String(config.img_height)}x${String(config.img_scale)}`);

util.mkdir(img_dir);    // Create image save directory TODO move to snap function

// Option for specifying dashboards to snap
const selected_dashboards = ((argv.uid) ? argv.uid.split(',') : []);

// TODO Better debug/logging/usage options
if (argv.debug) { config.debug = argv.debug; }

(async () => {
    if (config.debug) {
        console.log(`Server: ${config.hostname}`);
        console.log("Files");
        console.log(`  Image base directory (SNAP_IMG_DIR): ${img_dir}`)
        console.log(`  Server configuration file (SNAP_SRV_CFG_FILE): ${config.cfg_file_name}`);
        console.log(`  Dashboards configuration file (SNAP_DASHBOARDS_FILE): ${config.dashboards_file_name}`);
        console.log(`  Defaults file (SNAP_DEFAULTS_FILE): ${config.defaults_file_name}`);
        console.log("Images");
        console.log(`  Viewport (SNAP_IMG_WIDTH x SNAP_IMG_HEIGHT): ${config.img_width}x${config.img_height}`);
        console.log(`  Image filename sequence numbers (SNAP_IMG_SEQ): ${Boolean(config.img_seq)}`);
        console.log(`  Image scaling factor (SNAP_IMG_SCALE): ${config.img_scale}`);
        console.log(`  Image filename prefix (SNAP_IMG_PFX): ${config.img_pfx}`);
        console.log(`  Image filename suffix (SNAP_IMG_EXT): ${config.img_ext}`);
        if (img_ext.match(/\.jpg$/)) { console.log(`  JPG quality (SNAP_JPG_QUALITY): ${config.jpg_quality}`); }
        console.log("Waits");
        console.log(`  Default page load wait time: ${server_cfg.wait / 1000} seconds`);
        console.log(`  Default page settle time: ${server_cfg.pause / 1000} ${Math.floor(server_cfg.pause / 1000) == 1 ? "second" : "seconds"}`);
        console.log("Options");
        console.log(`  Headless mode (SNAP_HEADLESS): ${Boolean(config.headless)}`);
        console.log(`  Snap login page and log in (SNAP_LOG_IN): ${Boolean(config.log_in)}`);
        console.log(`  Snap container panels beyond viewport (--full): ${Boolean(argv.full)}`); // TODO make env var
        if (!argv.uid) { console.log("  Snapping all dashboards"); }
        else { console.log(`  Snapping selected (--uid): ${selected_dashboards.join(' ')}`); }
    }

    await util.check_versions();




    const browser = await puppeteer.launch({
        headless: config.headless,
        ignoreHTTPSErrors: true,
        timeout: 0,
        //        slowMo: 500,
        defaultViewport: {
            width: config.img_width,
            height: config.img_height,
            deviceScaleFactor: config.img_scale
        }
    });

    var page = await browser.newPage();
    // Default server wait can be overridden per dashboard
    page.setDefaultTimeout(server_cfg.wait);

    // Attempt login if configured (necessary for access to some dashboards)
    if (config.log_in) {
        await util.load(page, `${server_cfg.server}/${server_cfg.graph}/login`);
        await util.snap(page, 'Login', img_dir);
        try {
            console.info("Logging in");
            await util.login(page, server_cfg.wait);
        } catch (err) {
            console.error(`Can't login: ${err}`);
        }
    }

    /*************************************************************************************
     * A loop through all dashboards in dashboards config file (e.g. ./cfg/dashboards.json):
     *
     * Part 1: Build URL
     * Part 2: Define viewport
     * Part 3: Load the page and remove any 'cookie confirm' dialogue
     * Part 4: If no operations, snap the viewport and optionally (--full) unconstrained container
     * Part 5: If operations/steps, process them sequentially
     * Part 6: Close the browser page. This prevents long 'breadcrumb' paths cluttering the menu.
     */
    for (var d in dashboards) {
        var dash = dashboards[d]; // convenience handles

        // If specific dashboard UIDs given, skip all but them (--dash=uid,...)
        // TODO Check that supplied UIDs exist
        if (selected_dashboards.length > 0 && !selected_dashboards.includes(dash.uid)) {
            continue;
        }

        const wait = (dash.wait ? dash.wait : server_cfg.wait);

        // Different page on same browser - still logged in so privileged items should work (checks panel)
        page = await browser.newPage();
        //        page.setDefaultTimeout(server_cfg.wait);

        // PART 1 - Build URL
        // Create option string if needed
        var option_string = "";
        if (dash.options) { option_string = "?" + dash.options.join('&'); }
        // Most are dashboards with URLs built from config as SERVER/graph/d/UID
        // Exceptions (using 'url'): SERVER/swagger, SERVER/graph/login
        var server_url;
        if (dash.url) {
            server_url = `${server_cfg.server}/${dash.url}`;
        } else {
            server_url =
                `${server_cfg.server}/${server_cfg.graph}/${server_cfg.stem}/${dash.uid}${(option_string.length > 1) ? option_string : ''}`;
        }

        // PART 2 - Optional dashboard viewport
        const dashboard_viewport = { width: config.img_width, height: config.img_height };
        if (dash.viewport) { await util.viewport(page, dash.viewport); }

        // PART 3 - Load URL with either default global or dashboard-specific wait time
        await util.load(page, server_url, wait);

        // PART 4 - Dashboard-level snap (no operations)
        if (!dash.operations) {
            await util.snap(page, dash.title, img_dir);

            // Snap container without cropping at viewport
            // Skip any using 'url' element as these are outside of grafana
            if (argv.full && !dash.url) {
                try {
                    // Get height of container
                    const elem = await page.waitFor(defaults.container);
                    const bx = await elem.boundingBox();
                    // Resize viewport to container height plus padding
                    const vp = { width: config.img_width, height: bx.height + 150, deviceScaleFactor: config.img_scale };
                    await util.viewport(page, vp, true);
                    await util.snap(page, dash.title + "_full", img_dir, true);
                }
                catch (e) {
                    console.log(`${e}...Skipping full snap`);
                }
            }
        }

        // PART 5 - Operations - Any number of groups of steps, each step being an array of one of:
        // - move: move to (hover over) a selector;
        // - text: enter text into the selector;
        // - click: click the selector;
        // - blur: blur (make fuzzy) the element specified by selector;
        // - wait: explicitly wait for the specified period (in ms);
        // - snap: Explicitly snap the the specified selector or the whole viewport.
        // With no operations, a dashboard is automatically snapped.
        // If operations are used, dedicate at least one step to a full-window snap,
        // or add another dashboard entry with no operations.
        for (var o in dash.operations) {
            const operation = dash.operations[o]; // Convenience handle
            console.log(`Operation: ${o}: ${operation.name}`);

            for (var s in operation.steps) {
                const step = operation.steps[s]; // Convenience handle

                if (step.viewport) { await util.viewport(page, step.viewport); }

                try {
                    console.log(`  Step ${s}: ${step.name} (${step.type})`);

                    switch (step.type) {
                        case "wait":
                            console.log(`    ${step.period} ms`);
                            await page.waitFor(step.period);
                            break;
                        case "move":
                            await page.hover(step.selector);
                            break;
                        case "text":
                            await page.type(step.selector, String(step.value));
                            break;
                        case "click":
                            await page.click(step.selector);
                            break;
                        case "blur":
                            await page.addStyleTag({ content: `${step.selector} { filter: blur(2px); }` });
                            break;
                        case "snap":
                            const selector =
                                (step.selector) ?
                                    await page.waitForSelector(step.selector, { visible: true }) :
                                    page;
                            await process.stdout.write("    "); // Indent following message
                            await util.snap(selector, [dash.title, operation.name, step.name].join("_"), img_dir);
                            break;
                    }
                } catch (e) {
                    console.log(`Skipping (${e})`);
                }

            } // for step

        } // for operations
        // Reset
        await util.viewport(page, dashboard_viewport);

        // PART 6 - Close page (Prevent long and ugly 'breadcrumb' navigation)
        page.close();
    } // for dashboards

    await browser.close();
})();

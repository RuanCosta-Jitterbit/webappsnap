// Connects to PMM instance to take screenshots of each dashboard
'use strict';
const { chromium, firefox, webkit } = require('playwright');
const { argv } = require('yargs');
const path = require('path');
const util = require('./util.js'); // Utility functions: snapping, loading URLs
const config = require('./config.js'); // Start-up vs default configuration value handling
const { exit } = require('process');
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
    `${String(config.img_width)}x${String(config.img_height)}`);

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
        console.log(`  Image filename prefix (SNAP_IMG_PFX): ${config.img_pfx}`);
        console.log(`  Image filename suffix (SNAP_IMG_EXT): ${config.img_ext}`);
        if (img_ext.match(/\.jpg$/)) { console.log(`  JPG quality (SNAP_JPG_QUALITY): ${config.jpg_quality}`); }
        console.log("Waits");
        console.log(`  Default page load wait: ${server_cfg.wait / 1000} seconds`);
        console.log(`  Default page settle: ${server_cfg.pause / 1000} ${Math.floor(server_cfg.pause / 1000) == 1 ? "second" : "seconds"}`);
        console.log(`  SlowMo value (SNAP_SLOW_MO): ${config.slowmo / 1000} seconds`);
        console.log("Options");
        console.log(`  Headless mode (SNAP_HEADLESS): ${Boolean(config.headless)}`);
        console.log(`  Snap login page and log in (SNAP_LOG_IN): ${Boolean(config.log_in)}`);
        console.log(`  Snap container panels beyond viewport (--full): ${Boolean(argv.full)}`); // TODO make env var
        if (!argv.uid) { console.log("  Snapping all dashboards"); }
        else { console.log(`  Snapping selected (--uid): ${selected_dashboards.join(' ')}`); }
    }

    const browser = await webkit.launch({
        headless: config.headless,
        slowMo: config.slowmo
    });

    var page = await browser.newPage({ ignoreHTTPSErrors: true });
    page.setDefaultTimeout(server_cfg.wait);
    util.viewport(page, {
        width: config.img_width,
        height: config.img_height
    });

    // Attempt login if configured (necessary for access to some dashboards)
    if (config.log_in) {
        await util.load(page, `${server_cfg.server}/${server_cfg.graph}/login`);
        await page.waitForTimeout(server_cfg.pause); // extra time for background to load/render
        await util.snap(page, 'Login', img_dir);
        try {
            console.info("Logging in");
            await util.login(page, server_cfg.wait);
        } catch (err) {
            console.error(`Can't login: ${err}`);
        }
    }


    // TODO broken since 2.12.0 - Needs authentication
//    await util.check_versions();
//    console.log(await util.get_version());


    /*************************************************************************************
     * A loop through all dashboards in dashboards config file (e.g. ./cfg/dashboards.json):
     *
     * Part 1: Build URL
     * Part 2: Define viewport
     * Part 3: Load the page
     * Part 4: Remove any unwanted page elements:
     *   - 'cookie confirm' dialogue
     *
     * Part 5: If no operations, snap the viewport and optionally (--full) unconstrained container
     * Part 6: If operations/steps, process them sequentially
     */
    for (var d in dashboards) {
        var dash = dashboards[d]; // convenience handle

        // If specific dashboard UIDs given, skip all but them (--dash=uid,...)
        // TODO Check that supplied UIDs exist
        if (selected_dashboards.length > 0 && !selected_dashboards.includes(dash.uid)) {
            continue;
        }

        // Dashboards can be skipped by adding "skip": true in dashboards config
        if (dash.skip) {
            console.log(`Skipping ${dash.uid}`)
            continue;
        }

        page.setDefaultTimeout(server_cfg.wait);
        const wait = (dash.wait ? dash.wait : server_cfg.wait); // Dashboard waits override default

        // PART 1 - Build URL
        // Create option string if needed

        // Most are dashboards with URLs built from config as SERVER/graph/d/UID
        // Exceptions (using 'url'):
        // - SERVER/swagger
        // - SERVER/graph/login
        // - SERVER/alerting/list
        // - SERVER/alerting/notifications
        // - SERVER/settings
        var server_url;
        var option_string = "";
        if (dash.options) { option_string = "?" + dash.options.join('&'); }

        if (dash.url) {
            server_url = `${server_cfg.server}/${dash.url}${(dash.options) ? option_string : ''}`;
        } else {
            server_url = `${server_cfg.server}/${server_cfg.graph}/${server_cfg.dshbd}/${dash.uid}${(dash.options) ? option_string : ''}`;
        }

        // PART 2 - Viewport
        // Default when none specified
        const default_dashboard_viewport = { width: config.img_width, height: config.img_height };
        // Used to reset after loop
        var dashboard_viewport = default_dashboard_viewport;
        var operation_viewport = default_dashboard_viewport;

        // PART 3 - Load URL
        await util.load(page, server_url, wait);

        if (dash.viewport) {
            console.log(`Viewport ${dash.viewport.width}x${dash.viewport.height} for dashboard`);
            await util.viewport(page, dash.viewport);
            dashboard_viewport = dash.viewport;
        }

        // TODO Reliable way of knowing when page has completed loading

        // PART 4 - Remove unwanted elements
        await util.erase(page, defaults.cookie_popup_elem);
        await util.erase(page, defaults.breadcrumb_container);

        // PART 5 - Dashboard-level snap (no operations)
        if (!dash.operations) {
            await util.snap(page, dash.title, img_dir);

            // Snap container without cropping at viewport
            // Skip any using 'url' element as these are outside of grafana
            if (argv.full && !dash.url) {
                try {
                    // Get height of container
                    const elem = await page.waitForSelector(defaults.container, { visible: true });
                    const bx = await elem.boundingBox();
                    // Resize viewport to container height plus padding
                    const vp = { width: config.img_width, height: bx.height + 150 };
                    await util.viewport(page, vp, true);
                    await util.snap(page, dash.title + "_full", img_dir, true);
                }
                catch (e) {
                    console.log(`${e}...Skipping full snap`);
                }
            }
        }

        // PART 6 - Operations - Any number of groups of steps, each step being an array of one of:
        // - back: return to previous page
        // - wait: explicitly wait for the specified period (in ms);
        // - move: move to (hover over) a selector;
        // - text: enter text into the selector;
        // - press: press keys listed in array;
        // - click: click the selector;
        // - blur: blur (make fuzzy) the element specified by selector;
        // - highlight: draw yellow border around element;
        // - unhighlight: remove yellow border from element;
        // - snap: Explicitly snap the the specified selector or the whole viewport.
        // With no operations, a dashboard is automatically snapped.
        // If operations are used, dedicate at least one step to a full-window snap,
        // or add another dashboard entry with no operations.
        for (var o in dash.operations) {
            const operation = dash.operations[o]; // Convenience handle
            console.log(`Operation: ${o}: ${operation.name}`);

            // Viewport per operation
            if (operation.viewport) {
                console.log(`  Viewport for operation: ${operation.viewport.width}x${operation.viewport.height}`);
                await util.viewport(page, operation.viewport);
                operation_viewport = operation.viewport;
            }

            for (var s in operation.steps) {
                const step = operation.steps[s]; // Convenience handle
                try {
                    console.log(`  Step ${s}: ${step.name} (${step.type})`);
                    switch (step.type) {
                        case "back":
                            await page.goBack();
                            break;
                        case "wait":
                            console.log(`    ${step.period} ms`);
                            await page.waitForTimeout(step.period);
                            break;
                        case "move":
                            await page.hover(step.selector);
                            break;
                        case "text":
                            await page.type(step.selector, String(step.value));
                            break;
                        case "press":
                            for (var k in step.value) {
                                var key = String(step.value[k]);
                                console.log(`    Pressing ${key}`);
                                await page.press('body', key);
                            }
                            break;
                        case "click":
                            await page.click(step.selector);
                            break;
                        case "blur":
                            await page.addStyleTag({ content: `${step.selector} { filter: blur(2px); }` });
                            break;
                        case "highlight":
                            await page.addStyleTag({ content: `${step.selector} { border: ${defaults.highlight_style} }` });
                            break;
                        case "unhighlight":
                            await page.addStyleTag({ content: `${step.selector} { border: none }` });
                            break;
                        case "snap":
                            // Viewport per step
                            if (step.viewport) {
                                console.log(`    Viewport for step: ${step.viewport.width}x${step.viewport.height}`);
                                await util.viewport(page, step.viewport, true);
                            }
                            // If selector defined, snap only it, otherwise snap page
                            console.log(`    Viewport for snap: ${await page.viewportSize().width}x${await page.viewportSize().height}`);
                            const selector = (step.selector) ? await page.waitForSelector(step.selector, { visible: true }) : page;
                            process.stdout.write("    "); // Indent log message in snap function
                            await util.snap(selector, [dash.title, operation.name, step.name].filter(String).join("_"), img_dir);
                            console.log(`    Viewport reset to: ${operation_viewport.width}x${operation_viewport.height}`);
                            await util.viewport(page, operation_viewport); // Reset to operation viewport
                            break;
                    }
                } catch (e) {
                    console.log(`Skipping: ${e}`);
                }
            } // for step
            await util.viewport(page, dashboard_viewport); // Reset to dashboard viewport
        } // for operations
        await util.viewport(page, default_dashboard_viewport); // Reset to default viewport
    } // for dashboards
    await browser.close();

})();

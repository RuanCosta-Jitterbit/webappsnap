// Connects to PMM instance to take screenshots of each dashboard
'use strict';
const puppeteer = require('puppeteer');
const { argv } = require('yargs');
const path = require('path');
// Utility functions: snapping, loading URLs
const util = require('./util.js');
// Start-up vs default configuration value handling
var config = require('./config.js');

const dashboards = config.dashboards; // Dashboards definitions
const img_ext = config.img_ext;   // Image file extension (png/jpg)
const server_cfg = config.server_cfg; // Config file specific to a PMM server

// List dashboard UIDs and exit
if (argv.list) {
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
        console.log(`  Server configuration file (SNAP_CONFIG_FILE): ${config.cfg_file_name}`);
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
        console.log(`  Default page wait time: ${server_cfg.wait / 1000} seconds`);
        console.log(`  Default page pause time: ${server_cfg.pause / 1000} seconds`);
        console.log("Options");
        console.log(`  Headless mode (SNAP_HEADLESS): ${Boolean(config.headless)}`);
        console.log(`  Snap login page and log in (SNAP_LOG_IN): ${Boolean(config.log_in)}`);
        console.log(`  Snap container panels beyond viewport (--full): ${Boolean(argv.full)}`); // TODO make env var
        if (!argv.uid) { console.log("  Snapping all dashboards"); }
        else { console.log(`  Snapping selected (--uid=):  ${selected_dashboards.join(' ')}`); }
    }

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
    const page = await browser.newPage();
    // Default server wait can be overridden per dashboard
    await page.setDefaultTimeout(server_cfg.wait);

    // Attempt login if configured (necessary for access to some dashboards)
    if (config.log_in) {
        await util.load(page, `${server_cfg.server}/${server_cfg.graph}/login`, server_cfg.wait);
        await util.snap(page, 'Login', img_dir);
        try {
            await util.login(page, server_cfg.wait)
        } catch (err) {
            console.error(`Can't login: ${err}`);
        }
    }

    // Loop through all dashboards in dashboards config file (e.g. ./cfg/dashboards.json)
    for (var d in dashboards) {
        var dash = dashboards[d];

        // Override viewport if set
        var dashboard_viewport = { width: config.img_width, height: config.img_height };
        if (dash.viewport) {
            dashboard_viewport = dash.viewport;
        }

        // (re)set viewport
        await page.setViewport({
            width: dashboard_viewport.width,
            height: dashboard_viewport.height,
            deviceScaleFactor: config.img_scale
        });

        // If specific dashboard UIDs given, skip all but them (--dash=uid,...)
        if (selected_dashboards.length > 0 && !selected_dashboards.includes(dash.uid)) {
            continue;
            // TODO Check that supplied UIDs exist
        }

        // Build URL; append option string if present
        var option_string = '?';
        for (var i in dash.options) {
            option_string += dash.options[i] + '&';
        }

        // Build URL: Direct pages marked as 'direct' (e.g. swagger). URLs are server/UID
        // Others are dashboards with URLs built from config as server/graph/stem/UID
        var server_url;
        if (dash.direct) {
            server_url = `${server_cfg.server}/${dash.uid}/`;
        } else {
            server_url =
                `${server_cfg.server}/${server_cfg.graph}/${server_cfg.stem}/${dash.uid}${(option_string.length > 1) ? option_string : ''}`;
        }

        // Load URL with either default global or dashboard-specific wait time
        await util.load(page, server_url, (dash.wait ? dash.wait : server_cfg.wait));

        // Remove pesky cookie confirmation from pmmdemo.percona.com
        await util.eat(page); // TODO can this go inside load()?

        // Full-screen snaps with mouse-over (hover) (for tool-tips)
        for (var h in dash.move) {
            const move = dash.move[h];
            try {
                await page.hover(move.selector);
                await page.waitFor(server_cfg.pause);
                await util.snap(page, `${dash.title}_${move.name}`, img_dir);
            } catch(e) {
                console.log(`Can't snap ${move.selector} in ${dash.title} - skipping (${e})`);
            }
        }

        // Full-screen snaps with mouse clicks (for drop down menus etc)
        for (var c in dash.click) {
            var click = dash.click[c];
            try {
                await page.click(click.selector);
                await page.waitFor(server_cfg.pause);
                await util.snap(page, `${dash.title}_${click.name}`, img_dir);
                //            await page.click(click); // TODO some need clicking to remove (drop downs), some don't (radio buttons)
            } catch(e) {
                console.log(`Can't snap ${click.selector} in ${dash.title} - skipping (${e})`);
            }
        }




        // panel/component snaps
        if (dash.panels) {
            for (var p in dash.panels) {
                const panel = dash.panels[p];
                // For sparse elements, resize viewport (and reload)
                if (panel.viewport) {
                    await page.setViewport({
                        width: panel.viewport.width,
                        height: panel.viewport.height,
                        deviceScaleFactor: config.img_scale
                    });
                    // load to activate viewport
                    await util.load(page, server_url, (dash.wait ? dash.wait : server_cfg.wait));
                    await util.eat(page); // Eat cookie again
                }

                try {
                    var element = await page.waitForSelector(panel.selector, { timeout: server_cfg.pause });
                    await util.snap(element, dash.title + "_" + panel.name, img_dir);
                } catch (e) {
                    console.log(`Can't snap ${panel.selector} in ${dash.title} - skipping`);
                }

                // Need to reset and reload for subsequent panels. Adds signigicant extra time. TODO
                await page.setViewport({
                    width: dashboard_viewport.width,
                    height: dashboard_viewport.height,
                    deviceScaleFactor: config.img_scale
                });
                // load to activate viewport
                await util.load(page, server_url, (dash.wait ? dash.wait : server_cfg.wait));
                await util.eat(page); // Eat cookie again
            }
        }

        // Avoids duplicated snaps but needs extra entries in dashboards.json
        if (!dash.panels && !dash.move && !dash.click) {
            // Snap full page window
            await util.snap(page, dash.title, img_dir);
            // Snap container without cropping at viewport
            // (Skip any direct URLs that don't have the container element)
            if (argv.full && !dash.direct) {
                var elem = await page.waitForSelector(config.defaults.container);
                const bx = await elem.boundingBox();
                // increase viewport to height of container (plus a bit)
                await page.setViewport({
                    width: config.img_width,
                    height: bx.height + 60,
                    deviceScaleFactor: config.img_scale
                });
                // load again to activate viewport
                await util.load(page, server_url, (dash.wait ? dash.wait : server_cfg.wait));
                await util.eat(page); // Eat cookie again
                await util.snap(page, dash.title + "_full", img_dir);
            }
        }
    }
    await browser.close();
})();

// Connects to PMM instance to take screenshots of each dashboard
'use strict';
const puppeteer = require('puppeteer');
const { argv } = require('yargs');
const path = require('path');
// Utility functions: snapping, loading URLs
const util = require('./util.js');
// Start-up vs default configuration value handling
const config = require('./config.js');

const dashboards = config.dashboards; // Dashboards definitions
const img_ext = config.img_ext;   // Image file extension (png/jpg)
const server_cfg = config.server_cfg; // Config file specific to a PMM server

// List dashboard UIDs and exit
if (argv.list) {
    console.log(Array.from(new Set(dashboards.map(e1 => e1.uid).sort())).join("\n"));
    return;
}

// Images saved in subdirectories per hostname/resolution/scale under that specified
var img_dir = path.join(config.img_dir,
    server_cfg.name,
    String(config.img_width) + 'x' + String(config.img_height),
    String(config.img_scale));

util.mkdir(img_dir);    // Create image save directory TODO move to snap function

// Option for specifying dashboards to snap
const selected_dashboards = ((argv.dash) ? argv.dash.split(',') : []);

(async () => {
    if (argv.debug) {
        console.log(`Server: ${config.hostname}`);
        console.log(`Server configuration file: ${config.cfg_file_name}`);
        console.log(`Defaults file: ${config.defaults_file_name}`);
        console.log(`Requested Viewport: ${config.img_width}x${config.img_height}`);
        console.log(`Capture full container: ${argv.full}`);
        console.log(`Image scaling factor: ${config.img_scale}`);
        console.log(`Image file type: ${config.img_ext}`);
        console.log(`Image filename prefix: ${config.img_pfx}`);
        console.log(`Image filename sequence numbers: ${config.img_seq}`);
        if (img_ext.match(/\.jpg$/)) { console.log(`JPG quality: ${config.jpg_quality}`); }
        console.log(`Default page wait time: ${server_cfg.wait / 1000} seconds`);
        console.log(`Default page pause time: ${server_cfg.pause / 1000} seconds`);
        console.log(`Headless mode: ${Boolean(config.headless)}`);
        console.log("Snapping container panels beyond viewport: " + ((argv.full) ? "On" : "Off"));
        console.log(`Snapping container panels beyond viewport: ${Boolean(argv.full)}`);
        if (!argv.dash) { console.log("Snapping all listed dashboards"); }
    }

    const browser = await puppeteer.launch({
        headless: config.headless,
        ignoreHTTPSErrors: true,
        timeout: 0,
        defaultViewport: {
            width: config.img_width,
            height: config.img_height,
            deviceScaleFactor: config.img_scale
        }
    });
    const page = await browser.newPage();
    await page.setDefaultTimeout(server_cfg.wait);

    // Attempt login if configured (necessary for access to some dashboards)
    if (argv.login) {
        await util.load(page, server_cfg.server + 'login', server_cfg.wait);
        await util.snap(page, 'login', img_dir);
        try {
            await util.login(page, server_cfg.wait)
        } catch (err) {
            console.error("Can't login: " + err);
        }
    }

    // Loop through all dashboards in dashboards config file (e.g. ./cfg/dashboards.json)
    for (var d in dashboards) {
        var dash = dashboards[d];

        var viewport = { width: 1, height: 1 };
        if (dash.viewport) {
            viewport = dash.viewport;
        }

        // (re)set viewport
        await page.setViewport({
            width: config.img_width * viewport.width,
            height: config.img_height * viewport.height,
            deviceScaleFactor: config.img_scale
        });

        // If specific dashboard UIDs given, skip all but them (--dash=uid,...)
        if (selected_dashboards.length > 0 && !selected_dashboards.includes(dash.uid)) {
            continue;
        }

        // Build URL; append option string if present
        var option_string = '?';
        for (var i in dash.options) {
            option_string += dash.options[i] + '&';
        }
        var server_url = server_cfg.server + server_cfg.stem +
            dash.uid + ((option_string.length > 1) ? option_string : '');
        await util.load(page, server_url, (dash.wait ? dash.wait : server_cfg.wait));

        // Remove pesky cookie confirmation from pmmdemo.percona.com
        await util.eat(page); // TODO can this go inside load()?

        // Full-screen snaps with mouse clicks (for drop down menus etc)
        for (var c in dash.click) {
            var click = dash.click[c];
            await page.click(click.selector);
            await page.waitFor(server_cfg.pause);
            await util.snap(page, dash.title + "_" + click.name, img_dir);
            //            await page.click(click); // TODO some need clicking to remove (drop downs), some don't (radio buttons)
        }

        // Full-screen snaps with mouse-over (hover) (for tool-tips)
        for (var h in dash.move) {
            var move = dash.move[h];
            const element = await page.$(move.selector)
            const box = await element.boundingBox();
            await page.mouse.move(box.x + box.width/2, box.y + box.height/2); // Middle of element (Y0 is top left)
            await page.waitFor(server_cfg.pause);
            await util.snap(page, `${dash.title}_${move.name}`, img_dir);
        }

        // panel/component snaps
        if (dash.panels) {
            for (var p in dash.panels) {
                const panel = dash.panels[p];
                // For sparse elements, resize viewport (and reload)
                if (panel.viewport) {
                    await page.setViewport({
                        width: config.img_width * panel.viewport.width,
                        height: config.img_height * panel.viewport.height,
                        deviceScaleFactor: config.img_scale
                    });
                    // load to activate viewport
                    await util.load(page, server_url, (dash.wait ? dash.wait : server_cfg.wait));
                    await util.eat(page); // Eat cookie again
                }

                var element = await page.waitForSelector(panel.selector);
                await util.snap(element, dash.title + "_" + panel.name, img_dir);

                // Need to reset and reload for subsequent panels. Adds signigicant extra time. TODO
                await page.setViewport({
                    width: config.img_width,
                    height: config.img_height,
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
            if (argv.full) {
                // make height huge (x10) then reset
                await page.setViewport({
                    width: config.img_width,
                    height: 10 * config.img_height,
                    deviceScaleFactor: config.img_scale
                });
                // load again to activate viewport
                await util.load(page, server_url, (dash.wait ? dash.wait : server_cfg.wait));
                await util.eat(page); // Eat cookie again
                // selector for main container and bounding box for it
                var element = await page.waitForSelector(config.defaults.container);
                const box = await element.boundingBox();
                await util.snap(element, dash.title + "_full", img_dir, false, box);
            }
        }
    }
    await browser.close();
})();

// Connects to PMM instance to take screenshots of each dashboard
'use strict';
const puppeteer = require('puppeteer');
const { argv } = require('yargs');
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

util.mkdir(config.img_dir);    // Create image save directory TODO move to snap function

// Option for specifying dashboards to snap
const selected_dashboards = ((argv.dash) ? argv.dash.split(',') : []);

(async () => {
    if (argv.debug) {
        console.log("Server: " + config.hostname);
        console.log("Server configuration file: " + config.cfg_file_name);
        console.log("Requested Viewport: " + config.img_width + "x" + config.img_height);
        console.log("Capture full container: " + argv.full);
        console.log("Image scaling factor: " + config.img_scale);
        console.log("Image file type: " + config.img_ext);
        console.log("Image filename prefix: " + config.img_pfx);
        console.log("Image filename sequence numbers: " + config.img_seq);
        if (img_ext.match(/\.jpg$/)) { console.log("JPG quality: " + config.jpg_quality); }
        console.log(`Default page wait time: ${server_cfg.wait / 1000} seconds`);
        console.log(`Default page pause time: ${server_cfg.pause / 1000} seconds`);
        if (!config.headless) { console.log("HEADLESS MODE OFF"); }
        if (!argv.full) { console.log("Snapping container panels beyond viewport"); }
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
        await util.snap(page, 'login', config.img_dir);
        try {
            await util.login(page, server_cfg.wait)
        } catch (err) {
            console.error("Can't login: " + err);
        }
    }

    // Loop through all dashboards in default config file (./cfg/dashboards.json)
    for (var d in dashboards) {
        var dash = dashboards[d];

        // reset viewport in case of full panel snapping where viewport is enlarged
        await page.setViewport({
            width: config.img_width,
            height: config.img_height,
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
        await util.eat(page);

        // Full-screen snaps with mouse clicks (for drop down menus etc)
        for (var c in dash.click) {
            var click = dash.click[c];
            await page.click(click);
            await page.waitFor(server_cfg.pause);
            await util.snap(page, dashboards[d].title, config.img_dir);
        }

        // Full-screen snaps with mouse-over (hover) (for tool-tips)
        for (var h in dash.move) {
            var hover = dash.move[h];
            const element = await page.$(hover)
            const box = await element.boundingBox();
            await page.mouse.move(box.x + 2, box.y + 2); // Middle of element
            await page.waitFor(server_cfg.pause);
            await util.snap(page, dash.title, config.img_dir);
        }

        // panel/component snaps
        if (dash.panels) {
            for (var p in dash.panels) {
                const panel = dash.panels[p];
                var element = await page.waitForSelector(panel.selector);
                await util.snap(element, dash.title + "_" + panel.name, config.img_dir);
                await element.screenshot({path: dash.title + "_" + panel.name + ".jpg"});
            }
        } else {
            // Snap full page window
            await util.snap(page, dash.title, config.img_dir);

        }




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
            await util.snap(element, dash.title + "_full", config.img_dir, false, box);
        }

    }
    await browser.close();
})();

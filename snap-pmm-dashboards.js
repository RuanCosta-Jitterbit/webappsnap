// Connects to PMM instance to take screenshots of each dashboard
'use strict';
const puppeteer = require('puppeteer');

// Utility functions: snapping, loading URLs
const util = require('./util.js');
// Start-up vs default configuration value handling
const config = require('./config.js');

const dashboards = config.dashboards; // Dashboards definitions
const img_ext = config.img_ext;   // Image file extension (png/jpg)
const server_cfg = config.server_cfg; // Config file specific to a PMM server

util.mkdir(config.img_dir);    // Create image save directory TODO move to snap function

(async () => {
    console.log("Server: " + config.hostname);
    console.log("Server configuration file: " + config.cfg_file_name);
    console.log("Requested Viewport: " + config.img_width + "x" + config.img_height);
    console.log("Image scaling factor: " + config.img_scale);
    console.log("Image file type: " + config.img_ext);
    console.log("Image filename prefix: " + config.img_pfx);
    console.log("Image filename sequence numbers: " + config.img_seq);
    if (img_ext.match(/\.jpg$/)) { console.log("JPG quality: " + config.jpg_quality); }
    console.log(`Default page wait time: ${server_cfg.wait / 1000} seconds`);
    console.log(`Default page pause time: ${server_cfg.pause / 1000} seconds`);
    if (!config.headless) { console.log("HEADLESS MODE OFF"); }

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
    if (server_cfg.login) {
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

        // Build URL; append option string if present
        var option_string = '?';
        for (var i in dash.options) {
            option_string += dash.options[i] + '&';
        }
        var server_url = server_cfg.server + server_cfg.stem +
            dash.uid + ((option_string.length > 1) ? option_string : '');
        await util.load(page, server_url, (dash.wait ? dash.wait : server_cfg.wait));

        // Remove pesky cookie confirmation from pmmdemo.percona.com
        const cookie_popup = config.defaults.cookie_popup_elem;
        try {
            await page.$(cookie_popup, {
                timeout: 5000,
                visible: true
            });
            await page.evaluate((sel) => {
                var elements = document.querySelectorAll(sel);
                for (var i = 0; i < elements.length; i++) {
                    elements[i].parentNode.removeChild(elements[i]);
                }
            }, cookie_popup);
        } catch (err) { console.log("No cookie popup to remove: " + err + "\n"); }

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

        // Full-screen or panel/component snaps
        if (dash.panels) {
            for (var p in dash.panels) {
                const panel = dash.panels[p];
                var element = await page.waitForSelector(panel.selector);
                await util.snap(element, dash.title + "_" + panel.name, config.img_dir);
            }
        } else {
            await util.snap(page, dash.title, config.img_dir);
        }
    }
    await browser.close();
})();

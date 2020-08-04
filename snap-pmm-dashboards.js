// Connects to PMM instance to take screenshots of each dashboard
'use strict';
const puppeteer = require('puppeteer');

// Loads functions, config
const util = require('./util.js');
const config = require('./config.js'); // Config conduit
const { nextTick } = require('process');

const dashboards = config.dashboards; // The dashboards
const img_ext = config.img_ext;   // Image file extension

const server_cfg = config.server_cfg;

util.mkdir(config.img_dir);    // Create image save directory TODO move to snap function

(async () => {
    console.log("Server configuration file: " + config.cfg_file_name);
    console.log("Server: " + config.hostname);
    console.log("Server version: " + server_cfg.version);
    console.log("Viewport: " + config.img_width + "x" + config.img_height);
    console.log("Image scaling factor: " + config.img_scale);
    console.log("Image file type: " + config.img_ext);
    if (img_ext.match(/\.jpg$/)) { console.log("JPG quality: " + config.jpg_quality); }
    console.log("Default page wait time: " + server_cfg.wait/1000 + " seconds");
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

    // Attempt login if configured
    if (server_cfg.login) {
        await util.load(page, server_cfg.server + 'login', server_cfg.wait);
        await util.snap(page, 'login', config.img_dir);
        try {
            await util.login(page, server_cfg.wait)
        } catch (err) {
            console.error("Can't login: " + err);
        }
    }

    for (var d in dashboards) {
        // Build URL; append option string if present
        var option_string = '?';
        for (var i in dashboards[d].options) {
            option_string += dashboards[d].options[i] + '&';
        }
        var server_url = server_cfg.server + server_cfg.stem +
                         dashboards[d].uid + ((option_string.length > 1) ? option_string : '');
        await util.load(page, server_url, server_cfg.wait);

        // Remove pesky cookie confirmation from pmmdemo.percona.com
        const cookie_popup = config.defaults.cookie_popup_elem;
        try {
            await page.$(cookie_popup, {
                timeout: 5000,
                visible: true
            });
            await page.evaluate((sel) => {
                var elements = document.querySelectorAll(sel);
                for(var i=0; i< elements.length; i++){
                    elements[i].parentNode.removeChild(elements[i]);
                }
            }, cookie_popup);
        } catch(err) { console.log("No cookie popup to remove: " + err + "\n"); }

        // Pre-snap mouse clicks - needed for some dashboards (e.g. QAN)
        for (var c in dashboards[d].click) {
            var click = dashboards[d].click[c];
            await page.click(click);
            await page.waitFor(server_cfg.wait);
        }

        // Pre-snap mouse-over (hover)
        for (var h in dashboards[d].move) {
            var hover = dashboards[d].move[h];
            const element = await page.$(hover)
            const box = await element.boundingBox();
            await page.mouse.move(box.x+2,box.y+2);
        }

        // Snap panels/components, if any
        if (dashboards[d].panels) {
           for (var p in dashboards[d].panels) {
                const panel = dashboards[d].panels[p];
                var element = page.waitForSelector(panel.selector);
                await util.snap(element, dashboards[d].title + "_" + panel.name, config.img_dir);
            }
        } else { // Snap panels OR full pages
            await util.snap(page, dashboards[d].title, config.img_dir);
        }
    }
    await browser.close();
})();

// Connects to PMM instance to take screenshots of each dashboard
'use strict';
const puppeteer = require('puppeteer');

// Loads functions, config
const util = require('./util.js');

// Load per-dashboard values
const dashboards = util.config.dashboards; // The dashboards as a hash
const hostname = util.hostname; // extracted from server URL
const img_ext = util.img_ext;   // Image file extension

// Create image save directory TODO move to snap function
util.mkdir();

(async () => {
    console.log("Screen capturing " + util.config.name);
    console.log("Configuration: " + util.config_file);
    console.log("URL: " + util.config.server);
    console.log("Viewport: " + util.img_width + "x" + util.img_height);
    console.log("Image scaling factor: " + util.img_scale);
    console.log("Image file type: " + util.img_ext);
    if (img_ext.match(/\.jpg$/)) { console.log("JPG quality: " + util.jpg_quality); }
    console.log("Default page wait time: " + util.config.wait/1000 + " seconds");
    if (!util.headless) { console.log("HEADLESS MODE OFF"); }

    const browser = await puppeteer.launch({
        headless: util.headless,
        ignoreHTTPSErrors: true,
        timeout: 0,
//        slowMo: 100,
        defaultViewport: {
            width: util.img_width,
            height: util.img_height,
            deviceScaleFactor: util.img_scale
        }
    });
//    const context = await browser.createIncognitoBrowserContext();
//    const page = await context.newPage();
    const page = await browser.newPage();
    await page.setDefaultTimeout(util.config.wait);

    // try {
    //     await util.login(page)
    // } catch (err) {
    //     console.log("Can't login: " + err);
    // }

    // Snap all dashboards
    for (var d in dashboards) {

        // await page.setViewport({
        //     width: util.img_width,
        //     height: util.img_height,
        //     deviceScaleFactor: util.img_scale // DPI scaling
        // });

        // Build and append option string if present
        var option_string = '?';
        for (var i in dashboards[d].options) {
            option_string += dashboards[d].options[i] + '&';
        }

        await util.load(page, dashboards[d], util.config.server + dashboards[d].path + ((option_string.length > 1) ? option_string : '') ); // Dashboard full URL
        //        await page.waitForSelector(dashboards[d].wait);  // Element that indicates page is loaded TODO move to load()


        
        // Remove pesky cookie confirmation from pmmdemo.percona.com
        const cookie_popup = util.defaults.cookie_popup_elem;
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
        } catch(err) { console.log("No cookie popup to remove: " + err); } 


        if (dashboards[d].desc.match(/login/)) {
            await util.snap(page, dashboards[d]); // Snap before logging in
            try {
                await util.login(page, dashboards[d])
            } catch (err) {
                console.log("Can't login: " + err);
            }
        } else {
            await util.snap(page, dashboards[d]);
        }
    }
    await browser.close();
})();

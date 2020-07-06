// Connects to PMM instance to take screenshots of each dashboard
'use strict';
const puppeteer = require('puppeteer');

// Loads functions, config
const util = require('./util.js');

// Load per-dashboard values
const dashboards = util.config.dashboards; // The dashboards as a hash
const hostname = util.hostname; // extracted from server URL
const img_ext = util.img_ext;

// Create image save directory TODO move to snap function
util.mkdir();

(async () => {
    console.log("PMM Server Dashboard Screen Capture");
    console.log("Configuration: " + util.config_file);
    console.log("Server base URL: " + util.config.server);
    console.log("Snapping viewport: " + util.img_width + "x" + util.img_height);
    console.log("Image scaling factor: " + util.img_scale);
    console.log("Image file type: " + util.img_ext);
    if (img_ext.match(/\.jpg$/)) { console.log("JPG quality: " + jpg_quality); }
    console.log("Default wait time: " + util.config.default_time);

    const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true,
        timeout: 0,
        defaultViewport: {
            width: util.img_width,
            height: util.img_height,
            deviceScaleFactor: util.img_scale
        }
    });
    const context = await browser.createIncognitoBrowserContext();
    const page = await context.newPage();
    await page.setDefaultTimeout(util.config.default_time);

    // Negotiate and snap login page
    {
        const d = dashboards.pmm_home;
        const u = util.config.server + d.name;

        await page.setViewport({
            width: util.img_width * d.x,
            height: util.img_height * d.y,
            deviceScaleFactor: util.img_scale
        });

        try {
            await util.goto(page, u);
        } catch (err) {
            console.log("Can't connect to " + u);
            console.log(err);
            await browser.close(); return;
        }

        // pmmdemo automatically logs in. Force log out to show login screen
        if (hostname.match(/pmmdemo/g))
        {
            await page.click('body > grafana-app > sidemenu > div.sidemenu__bottom > div:nth-child(1) > a.sidemenu-link');
            await page.waitFor(util.config.default_time);
            await util.snap(page, d, '_login_password');

            await page.type('div.login-form:nth-child(1) > input:nth-child(1)', util.user);
            await page.type('#inputPassword', util.pass);
            await page.type('#inputPassword', String.fromCharCode(13)); // Submit login
            await page.waitFor(util.config.default_time);
        } else {
            // clear user/pass fields
            await page.$eval('div.login-form:nth-child(1) > input:nth-child(1)', el => el.value = '');
            await page.$eval('#inputPassword', el => el.value = '');

            // enter them
            await page.type('div.login-form:nth-child(1) > input:nth-child(1)', util.user);
            await page.type('#inputPassword', );
            await page.waitFor(util.config.default_time);

//            await util.snap(page, d, '_login_password_TEST');

            await page.type('#inputPassword', String.fromCharCode(13)); // Submit login
            await page.waitFor(util.config.default_time);

//            await util.snap(page, d, '_login_password_TEST'); // Skip page

            const skip_button = 'a.btn';
            await page.waitForSelector(skip_button, {visible: true, timeout: 30000});

            await page.click(skip_button)
            await page.waitFor(util.config.default_time);
        }
    }

    // Snap all listed dashboards using fields in dashboards hash
    for (var d in dashboards) {
        if (!dashboards[d].snap) { continue; } // Skip any with snap=false

        await page.setViewport({
            width: util.img_width * dashboards[d].x,   // Viewport scaled by factor
            height: util.img_height * dashboards[d].y,
            deviceScaleFactor: util.img_scale // DPI scaling
        });

        // Build option string for dashboards that need it to show data
        var option_string = '?';
        for (var i in dashboards[d].options) {
            option_string += dashboards[d].options[i] + '&';
        }

        await util.goto(page, util.config.server + dashboards[d].name + ((option_string.length > 1) ? option_string : '') ); // Dashboard full URL
        await page.waitForSelector(dashboards[d].wait);  // Element that indicates page is loaded

        // Remove pesky cookie confirmation from pmmdemo.percona.com
//            const cookie_popup = '[aria-label="cookieconsent"]';
        const cookie_popup = '[role="dialog"]';
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
            }, cookie_popup)

            await util.snap(page, dashboards[d], ''); // Don't snap unless popup cleaned
        } catch {
            console.log('No cookie popup to remove');
        }
    }
    await browser.close();
})();

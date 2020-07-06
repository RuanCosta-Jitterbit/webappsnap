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
    console.log("PMM Server Dashboard Screen Capture");
    console.log("Configuration: " + util.config_file);
    console.log("Server base URL: " + util.config.server);
    console.log("Snapping viewport: " + util.img_width + "x" + util.img_height);
    console.log("Image scaling factor: " + util.img_scale);
    console.log("Image file type: " + util.img_ext);
    if (img_ext.match(/\.jpg$/)) { console.log("JPG quality: " + util.jpg_quality); }
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
        const dashboard = dashboards.pmm_login;
        const dashboard_name = dashboard.toString();
        const url = util.config.server + dashboard.path;

        await page.setViewport({
            width: util.img_width * dashboard.x,
            height: util.img_height * dashboard.y,
            deviceScaleFactor: util.img_scale
        });

        try {
            await util.goto(page, url);
        } catch (err) {
            console.log("Can't connect to " + url);
            console.log(err);
            await browser.close(); return;
        }

        await util.snap(page, dashboard); // Login page

        // Login
        await page.type(util.defaults.login_user_elem, util.user);
        await page.type(util.defaults.login_pass_elem, util.pass);

        await page.type(util.defaults.login_pass_elem, String.fromCharCode(13)); // Submit login with 'Enter'
        // TODO intercept and report 'invalid username or password' dialog

        await page.waitFor(util.config.default_time);
    

            // // clear user/pass fields
            // await page.$eval('div.login-form:nth-child(1) > input:nth-child(1)', el => el.value = '');
            // await page.$eval('#inputPassword', el => el.value = '');

            // // enter them
            // await page.type('div.login-form:nth-child(1) > input:nth-child(1)', util.user);
            // await page.type('#inputPassword', );

//            await page.waitFor(util.config.default_time);

//        await util.snap(page, dashboard); // TEST

//            await page.type('#inputPassword', String.fromCharCode(13)); // Submit login
 //           await page.waitFor(util.config.default_time);

//            await util.snap(page, d, '_login_password_TEST'); // Skip page

        try 
        {
            const skip_button = util.defaults.login_skip_elem;
            await page.waitForSelector(skip_button, { visible: true, timeout: 5000 });
            
            await page.click(skip_button);
            await page.waitFor(util.config.default_time);
        } catch (err) {
            console.log("Didn't find password change skip button");
        }

    }
//        await util.snap(page, d); // TEST

// await browser.close(); return;//TEST



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

        await util.goto(page, util.config.server + dashboards[d].path + ((option_string.length > 1) ? option_string : '') ); // Dashboard full URL
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

        } catch {
            console.log('No cookie popup to remove');
        } finally {
            await util.snap(page, dashboards[d]);
        }
    }
    await browser.close();
})();

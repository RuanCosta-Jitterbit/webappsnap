// Connects to PMM instance to take screenshots of each dashboard
'use strict';
var fs = require('fs');
var uf = require('url');
const puppeteer = require('puppeteer');

// Dashboards to snap are in config TODO option for this to match URL
const config = require('./config.json');
// Selectors are elements for individual snapping TODO
//const selectors = require('./selectors.json');

// Get values from config
const db = config.dashboards;         // The dashboards
const version = config.version;
const url = config.server + 'graph/d/';
const host = uf.parse(url).hostname;
const default_time = config.default_time;




// IMAGE SIZE/RES & LOCATION
const w = process.env.WIDTH || 1920;
const h = process.env.HEIGHT || 1080;

const device_scale = Number(process.env.SCALE) || 1; // 2 for double size, 0.5 for half
const size = { width: Number(w), height: Number(h) };
const jpg_quality = Number(process.env.QUALITY) || 100; // JPG quality 0-100
const img_dir = process.env.IMGDIR || './img';

// PMM SERVER CREDENTIALS
const user = process.env.USER || "admin";
const pass = process.env.PASS || "admin";

// Save images in server/resolution subdirs TODO add configuration
var dir = img_dir + '/' + host + '/' + size.width + 'x' + size.height + '/' + device_scale + '/';
if (!fs.existsSync(dir)) { fs.mkdirSync(dir, {recursive: true} ); }

// Pad a number with zeros
function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

// Screenshot filenaming: dir/prefix + dashboard name
var idx = 1;
const ext = '.jpg';

// Convenience wrapper: jpg images have quality factor, png don't
async function snap(p, h, t) { // page, handle, text
    var fn = dir + pad(idx++,2) + '_' + h.name + t + ext;
    return await Promise.all([
        p.screenshot({path: fn}, { fullPage: true, quality: jpg_quality }),
        console.log('...Saved ' + fn)
    ]);
}

// Convenience wrapper: For logging, and for standard load wait time
async function goto(p, u) { // page, url
    console.log('Loading ' + u);
    return await Promise.all([    
        p.goto(u),
        p.waitFor(default_time)
    ]);
}


(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true,
        timeout: 0,
        defaultViewport: {
            width: size.width,
            height: size.height,
            deviceScaleFactor: device_scale
        }
    });
    const context = await browser.createIncognitoBrowserContext();
    const page = await context.newPage();
    await page.setDefaultTimeout(default_time);

    // Login
    {
        const d = db.pmm_home;
        await page.setViewport({
            width: size.width * d.x,
            height: size.height * d.y,
            deviceScaleFactor: device_scale
        });

        try {
            await goto(page, url + d.name);
        } catch (err) {
            console.log("Can't connect to " + url);
            console.log(err);
            await browser.close(); return;
        }

        // pmmdemo automatically logs in. Force log out to show login screen
        if (host.match(/pmmdemo/g))
        {
            await page.click('body > grafana-app > sidemenu > div.sidemenu__bottom > div:nth-child(1) > a.sidemenu-link');
            await page.waitFor(default_time);
            await snap(page, d, '_login_password');

            await page.type('div.login-form:nth-child(1) > input:nth-child(1)', user);
            await page.type('#inputPassword', pass);
            await page.type('#inputPassword', String.fromCharCode(13)); // Submit login
            await page.waitFor(default_time);
        }

        // TODO handle first-time login and pw change 'skip'

        // Clear fields
//        await page.$eval('div.login-form:nth-child(1) > input:nth-child(1)', el => el.value = '');
//        await page.$eval('#inputPassword', el => el.value = '');

        // skip password change
        // {
        //     await page.click('button.btn')
        //     await page.waitForSelector('a.btn', {visible: true, timeout: 30000});
        //     await snap(page, d, '_login_change_password_skip');
        //     await page.click('a.btn')
        // }
    }

    // Snap all listed dashboards using fields in db hash
    for (var d in db) {
        if (!db[d].snap) { continue; } // Skip any with snap=false

        await page.setViewport({
            width: size.width * db[d].x,   // Viewport is scaled by factor
            height: size.height * db[d].y,
            deviceScaleFactor: device_scale // DPI scaling
        });

        // Build option string for dashboards that need it to show data
        var option_string = '?';
        for (var i in db[d].options) {
            option_string += db[d].options[i] + '&';
        }

        await goto(page, url + db[d].name + ((option_string.length > 1) ? option_string : '') ); // Dashboard URL
//        await page.waitFor(db[d].time);          // Extra time for page to load
        await page.waitForSelector(db[d].wait);  // Element that indicates page is loaded

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

            await snap(page, db[d], ''); // Don't snap unless popup cleaned
        } catch {
            console.log('No cookie popup to remove');
        }
    }


    // Elements, panels for selected dashboards

    // QAN - Individual Panels
    // {
    //     const d = db.pmm_qan;
    //     await page.goto(url + d.name);
    //     // QAN - Select a query to show details
    //     await page.goto(url + d.name + '?query_selected=true');
    //     await Promise.all([page.waitForSelector(d.wait), page.waitFor(d.time)]);
    //     snap(page, d, '');

    // }

    //     // QAN - Details tab TODO how to select specific query
    //     {
    //         await page.goto(url + d.name + '?query_selected=true&details_tab=details');
    //         await Promise.all([page.waitForSelector('.details-tabs'), page.waitFor(5000)]);
    //         const element = await page.$('.details-tabs');
    //         await snap(page, d, '_details-tabs-details');
    //     }
    //     // QAN - Examples tab
    //     {
    //         await page.goto(url + d.name + '?query_selected=true&details_tab=examples');
    //         await Promise.all([page.waitForSelector('.details-tabs'), page.waitFor(5000)]);
    //         const element = await page.$('.details-tabs');
    //         await snap(page, d, '_details-tabs-examples');
    //     }
    //     // QAN - Tables tab
    //     {
    //         await page.goto(url + d.name + '?query_selected=true&details_tab=tables');
    //         await Promise.all([page.waitForSelector('.details-tabs'), page.waitFor(5000)]);
    //         const element = await page.$('.details-tabs');
    //         await snap(page, d, '_details-tabs-tables');
    //     }
    // }



    // PMM Inventory - Select & delete operation steps
    // {
    //     const d = db.pmm_inventory;
    //     await page.goto(url + d.name);
    //     await Promise.all([page.waitForSelector('#inventory-wrapper'), page.waitFor(5000)]);
    //     await page.$('#inventory-wrapper');
    //     await snap(page, d, '');

    //     await page.click('label.checkbox-container')
    //     await snap(page, d, '');

    //     await page.click('#inventory-wrapper > div.css-18m13of > div > div.css-12xi67t > button');
    //     await snap(page, d, '');
    // }

    // PMM Settings - open/close each section
    // {
    //     const d = db.pmm_settings;
    //     const settings_1 = {
    //         close: 'div.ant-collapse:nth-child(1) > div:nth-child(1) > div:nth-child(1)',
    //         open: 'div.ant-collapse:nth-child(1) > div:nth-child(1)'
    //     };
    //     const settings_2 = {
    //         open: 'div.ant-collapse-item:nth-child(2)',
    //         close: 'div.ant-collapse-item:nth-child(2) > div:nth-child(1)'
    //     };
    //     const settings_3 = {
    //         open: 'div.ant-collapse-item:nth-child(3)',
    //         close: 'div.ant-collapse-item:nth-child(3) > div:nth-child(1)'
    //     };
    //     const settings_4 = {
    //         open: 'div.ant-collapse-item:nth-child(4)',
    //         close: 'div.ant-collapse-item:nth-child(4) > div:nth-child(1)'
    //     };

    //     // Shrink view
    //     await page.setViewport({
    //         width: size.width * d.x,
    //         height: size.height * d.y,
    //         deviceScaleFactor: device_scale
    //     });
    //     await page.goto(url + d.name);
    //     await Promise.all([page.waitForSelector(d.wait), page.waitFor(5000)]);

        // Take panel only, crop half width
        // const elem = await page.$('.view');
        // const box = await bbox(elem);
        // await elem.screenshot({ // Note: Changing viewport doesn't crop element snao
        //     path: imgfn('settings-panel'),
        //     clip: { x: box.x,
        //             y: box.y,
        //             width: box.width/2,
        //             height: box.height }
        // });

//         await page.click(settings_1.close); // close Settings
//         await page.click(settings_2.open);  // open SSH Key Details
// //        await page.screenshot({path: imgfn(d.name + '_ssh_key_details'), fullPage: true});
//         await snap(page, d, '_ssh_key_details');

//         await page.click(settings_2.close);  // close SSH Key Details
//         await page.click(settings_3.open); // open Alertmanager integration
// //        await page.screenshot({path: imgfn(d.name + '_alertmanager_integration'), fullPage: true});
//         await snap(page, d, '_alertmanager_integration');

//         await page.click(settings_3.close); // close Alertmanager integration
//         await page.click(settings_4.open);  // open Diagnostics
// //        await page.screenshot({path: imgfn(d.name + '_diagnostics'), fullPage: true});
//         await snap(page, d, '_diagnostics');
//     }

    // Advanced Data Exploration - Metrics drop-down
//     {
//         const d = db.advanced_data;
//         await page.setViewport({
//             width: size.width * d.x,
//             height: size.height * d.y,
//             deviceScaleFactor: device_scale
//         });
//         await page.goto(url + d.name);
//         await Promise.all([page.waitForSelector(d.wait), page.waitFor(5000)]);
//         await page.click('.submenu-controls > div:nth-child(1) > div:nth-child(1) > value-select-dropdown:nth-child(2)');
// //        await page.screenshot({path: imgfn(d.name + '_metrics'), fullPage: true});
//         await snap(page, d, '_metrics');
//     }


    // PMM Home Page - Menus (Dashboard browser, time range selector)
//     {
//         const d = db.pmm_home;
//         await page.goto(url + d.name);
//         await page.waitForSelector(d.wait);

//         await page.waitFor(15000); // TEST

//         // Date/time range selector
//         await page.waitForSelector('button.navbar-button--tight');
//         await page.click('button.navbar-button--tight'); // click to open
//         await snap(page, d, '_time_range_settings');
//         await page.click('button.navbar-button--tight'); // click to close

//         // Dashboard dropdown
//         await page.click('.navbar-page-btn__search');
//         await page.waitFor(5000);
//         await snap(page, d, '_dashboard_dropdown');
//         // close dropdown TODO Not on pmmdemo yet - easier to reload page
// //        await page.keyboard.press('Escape');
//     }



    // QAN - small elements
    // for (var key in selectors) {
    //     const kv = selectors[key];
    //     await page.waitForSelector(kv);
    //     const element = await page.$(kv);
    //     await element.screenshot({
    //         path: imgfn(key)
    //     });
    // }






    await browser.close();
})();

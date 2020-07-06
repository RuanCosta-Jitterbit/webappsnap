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
    console.log("PMM Server Dashboard Screen Capture (QAN panels)");
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
    await page.setDefaultTimeout(default_time);




//     // Snap all listed dashboards using fields in db hash
//     for (var d in db) {
//         if (!db[d].snap) { continue; } // Skip any with snap=false

//         await page.setViewport({
//             width: width * db[d].x,   // Viewport is scaled by factor
//             height: height * db[d].y,
//             deviceScaleFactor: device_scale // DPI scaling
//         });

//         // Build option string for dashboards that need it to show data
//         var option_string = '?';
//         for (var i in db[d].options) {
//             option_string += db[d].options[i] + '&';
//         }

//         await goto(page, url + db[d].name + ((option_string.length > 1) ? option_string : '') ); // Dashboard URL
//         await page.waitForSelector(db[d].wait);  // Element that indicates page is loaded

//         // Remove pesky cookie confirmation from pmmdemo.percona.com
// //            const cookie_popup = '[aria-label="cookieconsent"]';
//         const cookie_popup = '[role="dialog"]';
//         try {
//             await page.$(cookie_popup, {
//                 timeout: 5000,
//                 visible: true
//             });
//             await page.evaluate((sel) => {
//                 var elements = document.querySelectorAll(sel);
//                 for(var i=0; i< elements.length; i++){
//                     elements[i].parentNode.removeChild(elements[i]);
//                 }
//             }, cookie_popup)

//             await snap(page, db[d], ''); // Don't snap unless popup cleaned
//         } catch {
//             console.log('No cookie popup to remove');
//         }
//     }


    // Elements, panels for selected dashboards TODO will use selectors info

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
    //         width: width * d.x,
    //         height: height * d.y,
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
//             width: width * d.x,
//             height: height * d.y,
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

'use strict';

var fs = require('fs');
var uf = require('url'); // URL functions
const puppeteer = require('puppeteer');

//const url = process.env.URL || 'http://localhost:80/'
var url = process.env.URL || 'https://pmmdemo.percona.com/';
url += 'graph/d/';
const host = uf.parse(url).hostname;

const default_time = 3000; // Default page wait (ms)
// Dashboards
const db = require('./config.json');

console.log("PMM server: " + host);

// Notes
// 4:3 aspect ratio resolutions: 640×480, 800×600, 960×720, 1024×768, 1280×960, 1400×1050, 1440×1080 , 1600×1200, 1856×1392, 1920×1440, and 2048×1536.
// 16:10 aspect ratio resolutions: – 1280×800, 1440×900, 1680×1050, 1920×1200 and 2560×1600.
// 16:9 aspect ratio resolutions: 1024×576, 1152×648, 1280×720, 1366×768, 1600×900, 1920×1080, 2560×1440 and 3840×2160.

// Default viewport size
const w = process.env.WIDTH || 1920;
const h = process.env.HEIGHT || 1080;
const size = { width: Number(w), height: Number(h) };

// Save images in server/resolution subdirs
var dir = './img/' + host + '/' + size.width + 'x' + size.height + '/';
if (!fs.existsSync(dir)){fs.mkdirSync(dir, {recursive: true});}

// QAN dashboard - Selectors for small elements TODO
const selectors = {
    qan_add_column: '.add-columns-selector > div:nth-child(1)',
    qan_pagination: '.ant-pagination',
};

// Pad a number with zeros
function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
// Screenshot filenaming: dir/prefix + dashboard name
var idx = 1;
function imgfn(name) {
    const fn = dir + pad(idx++,2) + '_' + name + '.png';
    //Use pad(idx++,2) for sequence number
    console.log('Saving ' + fn);
    return fn;
}
// Bounding box for element NOT USED
function bbox(elem) { return elem.boundingBox(); }




(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true,
        timeout: 0,
        defaultViewport: { width: size.width, height: size.height },
//        args: ['--purge_hint_cache_store']
    });
    const context = await browser.createIncognitoBrowserContext(); // Avoid cookie messages
    const page = await context.newPage();
    await page.setCacheEnabled(false);


    // Login TODO Difficult for pmmdemo
    {
        const d = db.pmm_home;
        await page.setViewport({ width: size.width * d.x, height: size.height * d.y });
        await Promise.all([
            await page.goto(url + d.name, { timeout: 0 } ),
//            page.waitForSelector(d.wait),
            page.waitFor(d.time)]);

        // pmmdemo automatically logs in. Force log out.
        if (host.match(/pmmdemo/g)) 
        {
            await page.click('body > grafana-app > sidemenu > div.sidemenu__bottom > div:nth-child(1) > a.sidemenu-link');
            await page.waitFor(d.time);
        }

        // Login screen
        await page.screenshot({path: imgfn(d.name + '_login')}, {fullPage: true});
        // user name
        await page.type('div.login-form:nth-child(1) > input:nth-child(1)', 'admin');
        await page.screenshot({path: imgfn(d.name + '_login_user')}, {fullPage: true});
        // password
        await page.type('#inputPassword', 'admin');
        await page.screenshot({path: imgfn(d.name + '_login_password')}, {fullPage: true});
    }

    // Avoid 'skip password change' on pmmdemo
    if (!host.match(/pmmdemo/g))
    {
        await page.click('button.btn')
        await page.waitForSelector('a.btn', {visible: true, timeout: 30000});
        // skip password change
        await page.screenshot({path: imgfn(d.name + '_login_change_password_skip')}, {fullPage: true});
        await page.click('a.btn')
    }


    // PMM Home Page - Menus (Dashboard browser, time range selector)
    {
        const d = db.pmm_home;
        await page.setViewport({ width: size.width * d.x, height: size.height * d.y });
        await page.goto(url + d.name);
        await Promise.all([page.waitForSelector(d.wait), page.waitFor(d.time)]);

        // Date/time range selector
        await page.click('button.navbar-button--tight'); // open
        await page.screenshot({path: imgfn(d.name + '_time_range_settings'), fullPage: true});
        await page.click('button.navbar-button--tight'); // close

        // Dashboard dropdown
        await page.click('.navbar-page-btn__search');
        await page.waitFor(5000);
        await page.screenshot({path: imgfn(d.name + '_dashboard_dropdown'), fullPage: true});
        // close dropdown
        await page.keyboard.press('Escape');
    }

    // Snap all listed dashboards using fields in db hash
    for (var d in db) {
        await Promise.all([
            page.setViewport({ width: size.width * db[d].x, height: size.height * db[d].y }),
            page.goto(url + db[d].name),
            page.waitForSelector(db[d].wait),
            page.waitFor(db[d].time)
        ]);
        await page.screenshot({path: imgfn(db[d].name), fullPage: true});
    }

    // QAN Panels
    {
        const d = db.pmm_qan;
        await page.goto(url + d.name);
        await Promise.all([page.waitForSelector(d.wait), page.waitFor(5000)]);
        // QAN Panels
        {
            const element = await page.waitForSelector('.ant-table-content');
            await element.screenshot({path: imgfn(d.name + '_overview_table')});
        }
        // QAN - Select a query to show details
        {
            await page.goto(url + d.name + '?query_selected=true');
            await Promise.all([page.waitForSelector(d.wait), page.waitFor(5000)]);
        }
        // filter
        {
            const element = await page.waitForSelector('.overview-filters');
            await element.screenshot({path: imgfn(d.name + '_overview-filters')});
        }
        // Select, snap, deselect 'sort' menu TODO Not needed?
        {
            const selector = 'th.ant-table-row-cell-last:nth-child(2) > span:nth-child(1) > div:nth-child(1) > span:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1)';
            await page.click(selector);
            await page.screenshot({path: imgfn(d.name + '_sort_menu'), fullPage: true});
            await page.click(selector);
        }

        // QAN - Details tab TODO how to select specific query
        {
            await page.goto(url + d.name + '?query_selected=true&details_tab=details');
            await Promise.all([page.waitForSelector('.details-tabs'), page.waitFor(5000)]);
            const element = await page.$('.details-tabs');
            await element.screenshot({path: imgfn(d.name + '_details-tabs-details')});
        }
        // QAN - Examples tab
        {
            await page.goto(url + d.name + '?query_selected=true&details_tab=examples');
            await Promise.all([page.waitForSelector('.details-tabs'), page.waitFor(5000)]);
            const element = await page.$('.details-tabs');
            await element.screenshot({path: imgfn(d.name + '_details-tabs-examples')});
        }
        // QAN - Tables tab
        {
            await page.goto(url + d.name + '?query_selected=true&details_tab=tables');
            await Promise.all([page.waitForSelector('.details-tabs'), page.waitFor(5000)]);
            const element = await page.$('.details-tabs');
            await element.screenshot({path: imgfn(d.name + '_details-tabs-tables')});
        }
    }

    // PMM Inventory - Select & delete operation steps
    {
        const d = db.pmm_inventory;

        await page.goto(url + d.name);
        await Promise.all([page.waitForSelector('#inventory-wrapper'), page.waitFor(5000)]);
        await page.$('#inventory-wrapper');
        await page.screenshot({path: imgfn(d.name)});

        await page.click('label.checkbox-container')
        await page.screenshot({path: imgfn(d.name)});

        await page.click('#inventory-wrapper > div.css-18m13of > div > div.css-12xi67t > button');
        await page.screenshot({path: imgfn(d.name), fullPage: true});
    }

    // PMM Settings - open/close each section
    {
        const d = db.pmm_settings;
        const settings_1 = {
            close: 'div.ant-collapse:nth-child(1) > div:nth-child(1) > div:nth-child(1)',
            open: 'div.ant-collapse:nth-child(1) > div:nth-child(1)'
        };
        const settings_2 = {
            open: 'div.ant-collapse-item:nth-child(2)',
            close: 'div.ant-collapse-item:nth-child(2) > div:nth-child(1)'
        };
        const settings_3 = {
            open: 'div.ant-collapse-item:nth-child(3)',
            close: 'div.ant-collapse-item:nth-child(3) > div:nth-child(1)'
        };
        const settings_4 = {
            open: 'div.ant-collapse-item:nth-child(4)',
            close: 'div.ant-collapse-item:nth-child(4) > div:nth-child(1)'
        };

        // Shrink view
        await page.setViewport({ width: size.width * d.x, height: size.height * d.y });
        await page.goto(url + d.name);
        await Promise.all([page.waitForSelector(d.wait), page.waitFor(5000)]);

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

        await page.click(settings_1.close); // close Settings
        await page.click(settings_2.open);  // open SSH Key Details
        await page.screenshot({path: imgfn(d.name + '_ssh_key_details'), fullPage: true});

        await page.click(settings_2.close);  // close SSH Key Details
        await page.click(settings_3.open); // open Alertmanager integration
        await page.screenshot({path: imgfn(d.name + '_alertmanager_integration'), fullPage: true});
        await page.click(settings_3.close); // close Alertmanager integration
        await page.click(settings_4.open);  // open Diagnostics
        await page.screenshot({path: imgfn(d.name + '_diagnostics'), fullPage: true});
    }

    // Advanced Data Exploration - Metrics drop-down
    {
        const d = db.advanced_data;
        await page.setViewport({ width: size.width * d.x, height: size.height * d.y });
        await page.goto(url + d.name);
        await Promise.all([page.waitForSelector(d.wait), page.waitFor(5000)]);
        await page.click('.submenu-controls > div:nth-child(1) > div:nth-child(1) > value-select-dropdown:nth-child(2)');
        await page.screenshot({path: imgfn(d.name + '_metrics'), fullPage: true});
    }





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

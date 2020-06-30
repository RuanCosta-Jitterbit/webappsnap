'use strict';

var fs = require('fs');

const puppeteer = require('puppeteer');
const url = process.env.URL || 'http://localhost:80/graph/d/' // Assume local docker instance for speed
const default_time = 3000; // Default page wait (ms)
// Dashboards TODO Read from config file
// Name is used in both snap filename and for dashboard URL
const db = {
    pmm_home:                       { name: 'pmm-home',                        x: 1.0, y: 1.0,   wait: '.main-view', time: 6000 },     // Insight (5)
    advanced_data:                  { name: '1oz9QMHmk',                       x: 1.0, y: 1.0,   wait: '.main-view', time: default_time }, // advanced-data-exploration pending name change
    prometheus:                     { name: 'prometheus',                      x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    prometheus_status:              { name: 'prometheus-status',               x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    prometheus_overview:            { name: 'prometheus-overview',             x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    mongodb_cluster_summary:        { name: 'mongodb-cluster-summary',         x: 1.0, y: 1.0,   wait: '.main-view', time: default_time }, // MongoDB (9)
    mongodb_inmemory:               { name: 'mongodb-inmemory',                x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    mongodb_instance_summary:       { name: 'mongodb-instance-summary',        x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    mongodb_instance_compare:       { name: 'mongodb-instance-compare',        x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    mongodb_instance_overview:      { name: 'mongodb-instance-overview',       x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    mongodb_mmapv1:                 { name: 'mongodb-mmapv1',                  x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    mongodb_replicaset_summary:     { name: 'mongodb-replicaset-summary',      x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    mongodb_rocksdb:                { name: 'mongodb-rocksdb',                 x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    mongodb_wiredtiger:             { name: 'mongodb-wiredtiger',              x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    mysql_amazonaurora:             { name: 'mysql-amazonaurora',              x: 1.0, y: 1.0,   wait: '.main-view', time: default_time }, // MySQL (20)
    mysql_commandhandler_compare:   { name: 'mysql-commandhandler-compare',    x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    mysql_innodb_compression:       { name: 'mysql-innodb-compression',        x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    mysql_innodb:                   { name: 'mysql-innodb',                    x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    mysql_instance_summary:         { name: 'mysql-instance-summary',          x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    mysql_instance_compare:         { name: 'mysql-instance-compare',          x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    mysql_instance_overview:        { name: 'mysql-instance-overview',         x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    mysql_myisamaria:               { name: 'mysql-myisamaria',                x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    mysql_myrocks:                  { name: 'mysql-myrocks',                   x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    mysql_performance_schema:       { name: 'mysql-performance-schema',        x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    mysql_queryresponsetime:        { name: 'mysql-queryresponsetime',         x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    mysql_replicaset_summary:       { name: 'mysql-replicaset-summary',        x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    mysql_table:                    { name: 'mysql-table',                     x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    mysql_tokudb:                   { name: 'mysql-tokudb',                    x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    mysql_user:                     { name: 'mysql-user',                      x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    mysql_waitevents_analysis:      { name: 'mysql-waitevents-analysis',       x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    proxysql_instance_summary:      { name: 'proxysql-instance-summary',       x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    pxc_cluster_summary:            { name: 'pxc-cluster-summary',             x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    pxc_node_summary:               { name: 'pxc-node-summary',                x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    pxc_nodes_compare:              { name: 'pxc-nodes-compare',               x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    node_cpu:                       { name: 'node-cpu',                        x: 1.0, y: 1.0,   wait: '.main-view', time: default_time }, // OS (10)
    node_disk:                      { name: 'node-disk',                       x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    node_memory:                    { name: 'node-memory',                     x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    node_network:                   { name: 'node-network',                    x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    node_instance_summary:          { name: 'node-instance-summary',           x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    node_temp:                      { name: 'node-temp',                       x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    node_instance_compare:          { name: 'node-instance-compare',           x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    node_instance_overview:         { name: 'node-instance-overview',          x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    node_memory_numa:               { name: 'node-memory-numa',                x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    node_cpu_process:               { name: 'node-cpu-process',                x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    pmm_add_instance:               { name: 'pmm-add-instance',                x: 1.0, y: 1.0,   wait: '.main-view', time: default_time }, // PMM (4)
    pmm_checks:                     { name: 'pmm-checks',                      x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    pmm_inventory:                  { name: 'pmm-inventory',                   x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    pmm_settings:                   { name: 'pmm-settings',                    x: 0.5, y: 0.8,   wait: '.view'     , time: default_time },
    postgresql_instance_summary:    { name: 'postgresql-instance-summary',     x: 1.0, y: 1.0,   wait: '.main-view', time: default_time }, // PostgreSQL (3)
    postgresql_instance_compare:    { name: 'postgresql-instance-compare',     x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    postgresql_instance_overview:   { name: 'postgresql-instance-overview',    x: 1.0, y: 1.0,   wait: '.main-view', time: default_time },
    pmm_qan:                        { name: 'pmm-qan',                         x: 1.0, y: 1.0,   wait: '.main-view', time: default_time }  // Query Analytics (1)
}

// Notes
// 4:3 aspect ratio resolutions: 640×480, 800×600, 960×720, 1024×768, 1280×960, 1400×1050, 1440×1080 , 1600×1200, 1856×1392, 1920×1440, and 2048×1536.
// 16:10 aspect ratio resolutions: – 1280×800, 1440×900, 1680×1050, 1920×1200 and 2560×1600.
// 16:9 aspect ratio resolutions: 1024×576, 1152×648, 1280×720, 1366×768, 1600×900, 1920×1080, 2560×1440 and 3840×2160.

// Default viewport size
const w = process.env.WIDTH || 1920;
const h = process.env.HEIGHT || 1080;
const size = { width: Number(w), height: Number(h) };

// Save images in resolution subdirs
var dir = './img/' + size.width + 'x' + size.height + '/';
if (!fs.existsSync(dir)){fs.mkdirSync(dir, {recursive: true});}

// QAN dashboard - Selectors for small elements
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

    const browser = await puppeteer.launch({headless: true, ignoreHTTPSErrors: true});
    const page = await browser.newPage();

    // Login
    {
        const d = db.pmm_home;
        await page.setViewport({ width: size.width * d.x, height: size.height * d.y });
        await Promise.all([
            await page.goto(url + d.name),
//            page.waitForSelector(d.wait),
            page.waitFor(d.time)]);
        // Login screen
        await page.screenshot({path: imgfn(d.name + '_login')}, {fullPage: true});
        // user name
        await page.type('div.login-form:nth-child(1) > input:nth-child(1)', 'admin');
        await page.screenshot({path: imgfn(d.name + '_login_user')}, {fullPage: true});
        // password
        await page.type('#inputPassword', 'admin');
        await page.screenshot({path: imgfn(d.name + '_login_password')}, {fullPage: true});
        await page.click('button.btn')
        await page.waitForSelector('a.btn', {visible: true, timeout: 30000});
        // skip password change
        await page.screenshot({path: imgfn(d.name + '_login_change_password_skip')}, {fullPage: true});
        await page.click('a.btn')
    }

    // EXPERIMENTS

    // QAN - Colour-highlight panels
    {
        const d = db.pmm_qan;
        await page.goto(url + d.name + '?query_selected=true');
        await Promise.all([page.waitForSelector('.main-view'), page.waitFor(6000)]);

//        const elem_overview = page.waitForSelector('.table-wrapper');
        const elem_filters = page.waitForSelector('.overview-filters');
//        const elem_details = page.$('.details-tabs');

//        await page.evaluate(el => el.style.border = "2px solid red", elem_overview);
        await page.evaluate(el => el.style.border = "2px solid yellow", elem_filters);
//        await page.evaluate(el => el.style.border = "2px solid green", elem_details);


        // Full page + highlighted panels
        await page.screenshot({path: imgfn(db.qan + '_highlighted'), fullPage: true});
    }


    // De-highlight
//    await page.evaluate(el => el.style.border = "", element_overview_select);
 //   await page.evaluate(el => el.style.border = "", element_filter);
  //  await page.evaluate(el => el.style.border = "", element_details);


    await browser.close();
})();

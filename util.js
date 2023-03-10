// Utility functions
var fs = require('fs');

//const { request } = require('http');
const axios = require('axios')
const path = require('path');
const config = require('./config.js');

// Increment screenshot file names
var idx = 1;

/*
** Create images directories
*/
function mkdir(dir) {
    if (!fs.existsSync(dir)) {
        try {
            console.log("Creating image save directory: " + dir);
            fs.mkdirSync(dir, { recursive: true });
        }
        catch (err) {
            console.error("Failed to create image save directory " + dir);
            return;
        }
    } else {
        console.log("Image save directory: " + dir + " (already exists)");
    }
}

/*
** Convenience wrapper for screenshots, and where the image filename is built
*/
async function snap(page, title = "", dir, full = false) {
    const sep = config.defaults.img_filename_sep;
    // Replace space, dot, slash with sep char
    title = title.replace(/[\. \\\/]/g, sep);

    // Array of two (possibly empty) prefixes joined with title and extension
    const filename = [
        (config.img_seq ? pad(idx++) : null),
        (config.img_pfx ? config.img_pfx : null),
        title
    ].filter(function (a) { return a != null; }).join(sep) + config.img_ext;

    const filepath = path.join(dir, filename);
//    process.stdout.write(`Saving ${filepath} ... `);

    // Set up options for snap
    var options = {};
    options.path = filepath;
//    options.scale = 'css';
//    options.animations = 'disabled';
    if (config.img_ext == '.jpg') {
        options.type = 'jpeg';
        options.quality = config.defaults.jpg_quality;
    }
    if (full) { options.fullPage = true; }

    try {
        await page.screenshot(options);
//        process.stdout.write("Done\n");
    } catch (err) {
//        process.stderr.write("Failed to save image " + err + "\n");
        console.error(`Failed to save image ${err}`);
    }
}

/*
** Zero-pad filename increment integer
*/
function pad(n, w = 3, z = '0') { // number, width, padding char
    n = String(n);
    return n.length >= w ? n : new Array(w - n.length + 1).join(z) + n;
}

/*
** Convenience wrapper for loading pages with logging and standard load wait time
*/
async function load(page, url, wait = config.server_cfg.wait, force_wait = false) {
    try {
        console.log(`  Loading ${url} (timeout ${wait / 1000} ${Math.floor(wait / 1000) == 1 ? "second" : "seconds"})`);

        await page.goto(url,
            {
//                waitUntil: 'networkidle',
                timeout: wait
            }
        );
        if (force_wait) {
            await page.waitForTimeout(wait); // Force Wait before snap
        }
    } catch (e) {
        console.error(`Can't load ${url} - skipping (${e})`);
    }
    // TODO handle net::ERR_INTERNET_DISCONNECTED
}

/*
** Convenience viewport setter (with reload option)
*/
async function viewport(page, viewport, reload = false) {
    try {
        await page.setViewportSize({
            width: viewport.width,
            height: viewport.height
        });
        if (reload) {
            console.log(`Reloading (timeout=${config.server_cfg.wait / 1000})`);
            await page.reload({
                waitUntil: 'load',
                timeout: config.server_cfg.wait
            });
        }
    } catch (e) {
        console.error(`Failed setting viewport - ${e}`);
    }
}

module.exports.snap = snap;
module.exports.mkdir = mkdir;
module.exports.load = load;
module.exports.viewport = viewport;

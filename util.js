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
    ]
        .filter(function (a) { return a != null; }).join(sep) + config.img_ext;

    const filepath = path.join(dir, filename);
    process.stdout.write(`Saving ${filepath} ... `);

    // Set up options for snap
    var options = {};
    options.path = filepath;
    if (config.img_ext == '.jpg') {
        options.type = 'jpeg';
        options.quality = config.defaults.jpg_quality;
    }

    // Doesn't work as expected - needs viewport set to full size of container
    // https://github.com/puppeteer/puppeteer/blob/main/docs/api.md#pagescreenshotoptions
    if (full) { options.fullPage = true; }

    // TEST can this option affect sparkline tooltip capture?
    //    options.omitBackground = true;

    try {
        await page.screenshot(options);
        process.stdout.write("Done\n");
    } catch (err) {
        process.stderr.write("Failed: " + err + "\n");
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
        console.log(`Loading ${url} (timeout ${wait / 1000} ${Math.floor(wait / 1000) == 1 ? "second" : "seconds"})`);

        await page.goto(url,
            {
                waitUntil: 'networkidle'
                ,timeout: wait
            }
        );
        if (force_wait) {
            await page.waitForTimeout(wait); // Force Wait before snap
        }

        //await eat(page); // TODO remove cookie
    } catch (e) {
        console.error(`Can't load ${url} - skipping (${e})`);
    }
    // TODO handle net::ERR_INTERNET_DISCONNECTED
}

/*
** Convenience viewport setter (with reload)
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
            //await eat(page); // TODO
        }
    } catch (e) {
        console.error(`Failed setting viewport - ${e}`);
    }
}

/*
** Delete cookie popup elements
*/
async function eat(page) {
    const cookie_popup = config.defaults.cookie_popup_elem;
    try {
        await page.$(cookie_popup, {
            timeout: config.server_cfg.pause,
            visible: true
        });
        await page.evaluate((sel) => {
            var elements = document.querySelectorAll(sel);
            for (var i = 0; i < elements.length; i++) {
                elements[i].parentNode.removeChild(elements[i]);
            }
        }, cookie_popup);
    } catch (err) { console.log("No cookie popup to remove: " + err + "\n"); }
}

/*
** Remove element from page
*/
async function erase(page, element) {
    try {
        await page.$(element, {
            timeout: config.server_cfg.pause,
            visible: true
        });
        await page.evaluate((sel) => {
            var elements = document.querySelectorAll(sel);
            for (var i = 0; i < elements.length; i++) {
                elements[i].parentNode.removeChild(elements[i]);
            }
        }, element);
    } catch (err) { console.log("Can't remove element" + err + "\n"); }
}

/*
** GET via Swagger API
*/
async function swagger(url, callback) {
    try {
        var ret = await axios.get(url, {
            auth: {
                username: config.user,
                password: config.pass
            }
        });
        return callback(ret.data);
    } catch (e) {
        console.log(e);
    }
}

// Check versions TODO
async function check_versions() {
    swagger('http://' + config.hostname + '/v1/version',
        function (response) {
            if (response.version == config.defaults.version
                &&
                response.version == config.pages_version) {
                console.log("Versions match");
            } else {
                console.error(`WARNING: Configuration/server version mismatch - Defaults (${config.defaults.version}), Dashboards (${config.pages_version}), PMM Server (${response.version})`);
            }
        }
    );
}
// TODO
async function get_version() {
    swagger('http://' + config.hostname + '/v1/version',
        function (response) {
            return response.version;
        }
    );
}

module.exports.snap = snap;
module.exports.mkdir = mkdir;
module.exports.load = load;
module.exports.eat = eat;
module.exports.erase = erase;
module.exports.viewport = viewport;
module.exports.swagger = swagger;
module.exports.check_versions = check_versions;
module.exports.get_version = get_version;

// Utility functions
var fs = require('fs');
const path = require('path');
const config = require('./config.js');

// Increment screenshot file names
var idx = 1;

// Create images directories
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

// Convenience wrapper for screenshots, and where the image filename is built
async function snap(page, title = "", dir, boundingBox = null) {
const filename =
    (config.img_seq ? pad(idx++, 2) + '_' : '') + // Optional sequence number
    config.img_pfx +                              // Configurable prefix
    title.replace(/[\. \\\/]/g, "_") +            // Title (replace dots, spaces and forward/back slashes)
    config.img_ext;                               // Image extension (.png/.jpg)

    const filepath = path.join(dir, filename);
    await process.stdout.write("Saving " + filepath + " ... ");

    var options = {};
    options.path = filepath;
    if (config.img_ext == '.jpg') {
        options.type = 'jpeg';
        options.quality = config.defaults.jpg_quality;
    }
    if (boundingBox) {
        options.clip = boundingBox;
        options.fullPage = false;
    }

    try {
            await page.screenshot(options);
            await process.stdout.write("Done\n");
    } catch (err) {
        await process.stderr.write("Failed: " + err + "\n");
    }
}

// Zero-pad filename increment integer
function pad(n, w, z) { // number, width, padding char (default: 0)
    z = z || '0';
    n = n + '';
    return n.length >= w ? n : new Array(w - n.length + 1).join(z) + n;
}

// Convenience wrapper for loading pages with logging and standard load wait time
async function load(page, url, wait) {
    try {
        console.log("Loading " + url + " - " + "Waiting " + wait / 1000 + " seconds");
        await Promise.all([
            page.goto(url, { waitUntil: 'load' }),
            page.waitFor(wait)
        ]);
    } catch (err) {
        console.error("Can't load " + url + " - " + err);
    }
    // TODO handle net::ERR_INTERNET_DISCONNECTED
}

// Handle PMM login page
async function login(page, wait) {
    // Type in username and password and press Enter
    await page.type(config.defaults.login_user_elem, config.user);
    await page.type(config.defaults.login_pass_elem, config.pass);
    await page.keyboard.press('Enter');
    await page.waitFor(wait); // Wait for login

    // TODO intercept and report 'invalid username or password' dialog

    // How to clear user/pass fields
    // await page.$eval('div.login-form:nth-child(1) > input:nth-child(1)', el => el.value = '');
    // await page.$eval('#inputPassword', el => el.value = '');

    try {
        const skip_button = config.defaults.login_skip_elem;
        await page.waitForSelector(skip_button, { visible: true, timeout: 5000 });
        await page.click(skip_button);
        await page.waitFor(wait);
    } catch (err) {
        await console.log("Didn't find password change skip button");
    }
}

async function eat(page) {
    const cookie_popup = config.defaults.cookie_popup_elem;
        try {
            await page.$(cookie_popup, {
                timeout: 5000,
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

// EXPORTS
//   functions
module.exports.snap = snap;
module.exports.mkdir = mkdir;
module.exports.load = load;
module.exports.login = login;
module.exports.eat = eat;

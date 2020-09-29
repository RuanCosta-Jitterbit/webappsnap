// Utility functions
var fs = require('fs');
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
async function snap(page, title = "", dir, full=false) {
    // Replace space, dot, slash with underscore
    title = title.replace(/[\. \\\/]/g, "_");

    // Array of two (possibly empty) prefixes joined with title and extension
    const filename = [
        (config.img_seq ? pad(idx++) : null),
        (config.img_pfx ? config.img_pfx : null),
        title].filter(function (a) { return a != null; }).join('_') + config.img_ext;

    const filepath = path.join(dir, filename);
    process.stdout.write("Saving " + filepath + " ... ");

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
async function load(page, url, wait = config.server_cfg.wait) {
    try {
        console.log(`Loading ${url} - Waiting ${wait / 1000} ${Math.floor(wait / 1000) == 1 ? "second" : "seconds"}`);
        await Promise.all([
            // TODO Not easy to tell when page is loaded/visible
            page.goto(url, { waitUntil: ['load', 'networkidle2'] }),
            page.waitFor(wait)]);
    } catch (e) {
        console.error(`Can't load ${url} - skipping (${e})`);
    }
    // TODO handle net::ERR_INTERNET_DISCONNECTED
}

/*
** Handle PMM login page
*/
async function login(page, wait) {
    // Type in username and password and press Enter
    await page.type(config.defaults.login_user_elem, config.user);
    await page.type(config.defaults.login_pass_elem, config.pass);
    await page.keyboard.press('Enter');
    await page.waitFor(wait); // Wait for login

    // TODO intercept and report 'invalid username or password' dialog

    // to clear user/pass fields:
    // await page.$eval('div.login-form:nth-child(1) > input:nth-child(1)', el => el.value = '');
    // await page.$eval('#inputPassword', el => el.value = '');

    try {
        const skip_button = config.defaults.login_skip_elem;
        await page.waitForSelector(skip_button, { visible: true, timeout: 5000 });
        await page.click(skip_button);
        await page.waitFor(wait);
        //        console.log(`Current URL: ${page.url()}`);
    } catch (err) {
        console.log("Didn't find password change skip button");
    }
}

/*
** Delete cookie popup element extant on pmmdemo
*/
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

/*
** Convenience viewport setter
*/
async function viewport(page, viewport) {
    try {
        await page.setViewport({
            width: viewport.width,
            height: viewport.height,
            deviceScaleFactor: config.img_scale
        });
        // setViewport needs a reload
        await page.reload({ waitUntil: ['load', 'networkidle2'] });
    } catch (e) {
        console.error(e);
    }
}

module.exports.snap = snap;
module.exports.mkdir = mkdir;
module.exports.load = load;
module.exports.login = login;
module.exports.eat = eat;
module.exports.viewport = viewport;

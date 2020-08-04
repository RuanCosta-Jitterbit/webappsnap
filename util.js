// Utility functions
var fs = require('fs');
const config = require('./config.js');

// Increment screenshot file names
var idx = 1;

// Create images directories
function mkdir(dir) {
    if (!fs.existsSync(dir)) {
        try {
            console.log("Creating image save directory: " + dir);
            fs.mkdirSync(dir, {recursive: true} );
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
async function snap(p, title="", dir) { // page, text, directory
    var filename =
        dir +
        config.img_pfx +                        // Prefix
        pad(idx++,2) + '_' +             // Sequence number and separator
        title.replace(/[\. \\\/]/g, "_") + // Title (replace dots, spaces and forward/back slashes)
        config.img_ext;                         // Image extension (.png/.jpg)
    process.stdout.write("Saving " + filename + " ... ");

    try
    {
        await (await p).screenshot({path: filename}, {
            fullPage: true,
            quality: config.defaults.jpg_quality
        });
        process.stdout.write("Done\n");
    } catch (err) {
        process.stderr.write("Failed: " + err + "\n");
    }
}

// Zero-pad filename increment integer
function pad(n, w, z) { // number, width, padding char (default: 0)
  z = z || '0';
  n = n + '';
  return n.length >= w ? n : new Array(w - n.length + 1).join(z) + n;
}

// Convenience wrapper for loading pages with logging and standard load wait time
async function load(p, u, w) { // page, url, wait
    try {
        console.log("Loading " + u + " - " + "Waiting " + w/1000 + " seconds");
        await Promise.all([
            p.goto(u),
            p.waitFor(w)
        ]);
    } catch (err) {
        console.error("Can't load " + u + " - " + err);
    }
    // TODO handle net::ERR_INTERNET_DISCONNECTED
}

// Handle PMM login page
async function login(p, w) // page, wait
{
    // Type in username and password and press Enter
    await p.type(config.defaults.login_user_elem, config.user);
    await p.type(config.defaults.login_pass_elem, config.pass);
    await p.keyboard.press('Enter');
    await p.waitFor(w); // Wait for login

    // TODO intercept and report 'invalid username or password' dialog

// How to clear user/pass fields
// await page.$eval('div.login-form:nth-child(1) > input:nth-child(1)', el => el.value = '');
// await page.$eval('#inputPassword', el => el.value = '');

    try
    {
        const skip_button = config.defaults.login_skip_elem;
        await p.waitForSelector(skip_button, { visible: true, timeout: 5000 });
        await p.click(skip_button);
        await p.waitFor(w);
    } catch (err) {
        await console.log("Didn't find password change skip button");
    }
}

// EXPORTS
//   functions
module.exports.snap = snap;
module.exports.mkdir = mkdir;
module.exports.load = load;
module.exports.login = login;

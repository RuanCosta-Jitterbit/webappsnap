// Utility functions and common configuration

var uf = require('url');
var fs = require('fs');

// Default configuration values
const defaults = require('./cfg/defaults.json');

// Per-dashboard configuration values
const config_file = process.env.SNAP_CONFIG_FILE || defaults.config_file;
const config = require(config_file);

// Override defaults.json values with env vars, if set
const img_dir     = process.env.SNAP_IMGDIR || defaults.img_dir;
const jpg_quality = Number(process.env.SNAP_JPG_QUALITY) || defaults.jpg_quality; // jpg only
const user        = process.env.SNAP_USER || defaults.user;
const pass        = process.env.SNAP_PASS || defaults.pass;
const headless    = ((process.env.SNAP_HEADLESS) ? (process.env.SNAP_HEADLESS == 'true') : (defaults.headless === true));
const img_pfx     = process.env.SNAP_IMG_PFX || defaults.img_pfx;
const img_ext     = process.env.SNAP_IMG_EXT || defaults.img_ext;
const img_width   = Number(process.env.SNAP_IMG_WIDTH) || defaults.img_width;
const img_height  = Number(process.env.SNAP_IMG_HEIGHT) || defaults.img_height;
const img_scale   = Number(process.env.SNAP_IMG_SCALE) || defaults.img_scale; 

// Get values from server config
const hostname = uf.parse(config.server).hostname;

// Image save directory
var dir = img_dir + '/' + hostname + '/' + img_width + 'x' + img_height + '/' + img_scale + '/';

// Increment screenshot file names
var idx = 1;

// Create images directories
function mkdir() {
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
async function snap(p, title="") { // page, dashboard, text
    var filename = 
        dir +                            // Directory (see above)
        img_pfx +                        // Prefix
        pad(idx++,2) + '_' +             // Sequence number and separator
        title.replace(/[ \\\/]/g, "_") + // Title (replace spaces and forward/back slashes)
        img_ext;                         // Image extension (.png/.jpg)
    process.stdout.write("Saving " + filename + " ... ");

    try 
    {
        await p.screenshot({path: filename}, { 
            fullPage: true, 
            quality: defaults.jpg_quality 
        });
        process.stdout.write("Done\n");
    } catch (err) {
        process.stderr.write("Failed: " + err);
    }
}

// Zero-pad filename increment integer
function pad(n, w, z) { // number, width, padding char (default: 0)
  z = z || '0';
  n = n + '';
  return n.length >= w ? n : new Array(w - n.length + 1).join(z) + n;
}

// Convenience wrapper for loading pages with logging and standard load wait time
async function load(p, u) { // page, url
    try {
        console.log("Loading " + u + " - " + "Waiting " + config.wait/1000 + " seconds");
        await Promise.all([    
            p.goto(u),
            p.waitFor(config.wait)
        ]);
    } catch (err) {
        console.error("Can't load " + u + " - " + err);
    }
    // TODO handle net::ERR_INTERNET_DISCONNECTED
}

// Handle PMM login page
async function login(page, dashboard)
{
    const url = config.server + dashboard.uid;

    // Type in username and password and press Enter
    await page.type(defaults.login_user_elem, user);
    await page.type(defaults.login_pass_elem, pass);
    await page.keyboard.press('Enter');

    await page.waitFor(config.wait); // Wait for login

    // TODO intercept and report 'invalid username or password' dialog

// How to clear user/pass fields
// await page.$eval('div.login-form:nth-child(1) > input:nth-child(1)', el => el.value = '');
// await page.$eval('#inputPassword', el => el.value = '');

    try 
    {
        const skip_button = defaults.login_skip_elem;
        await page.waitForSelector(skip_button, { visible: true, timeout: 5000 });            
        await page.click(skip_button);
        await page.waitFor(config.wait);
    } catch (err) {
        await console.log("Didn't find password change skip button");
    }
}

// EXPORTS

// functions
module.exports.snap = snap;
module.exports.mkdir = mkdir;
module.exports.load = load;
module.exports.login = login;

// Data structures
module.exports.config = config;
module.exports.defaults = defaults;

// Values
module.exports.config_file = config_file;
module.exports.hostname = hostname;
module.exports.user = user;
module.exports.pass = pass;
module.exports.headless = headless;
module.exports.img_height = img_height;
module.exports.img_width = img_width;
module.exports.img_scale = img_scale;
module.exports.jpg_quality = jpg_quality;
module.exports.img_ext = img_ext;

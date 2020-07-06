// Utility functions and common configuration

var uf = require('url');
var fs = require('fs');

// Default configuration values
const defaults = require('./defaults.json');

// Per-dashboard configuration values
const config_file = process.env.SNAP_CONFIG_FILE || defaults.config_file;
const config = require(config_file);

// Override defaults.json values with env vars, if set
const img_dir     = process.env.SNAP_IMGDIR || defaults.img_dir;
const jpg_quality = Number(process.env.SNAP_JPG_QUALITY) || defaults.jpg_quality; // Only jpg uses quality factor
const user        = process.env.SNAP_USER || defaults.user;
const pass        = process.env.SNAP_PASS || defaults.pass;
const img_ext     = process.env.SNAP_IMG_EXT || defaults.img_ext;
const img_width   = Number(process.env.SNAP_IMG_WIDTH) || defaults.img_width;
const img_height  = Number(process.env.SNAP_IMG_HEIGHT) || defaults.img_height;
const img_scale   = Number(process.env.SNAP_IMG_SCALE) || defaults.img_scale; 

// Get values from server config
//const url = config.server;
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
            console.log("Failed to create image save directory " + dir);
            return;
        }
    } else {
        console.log("Image save directory: " + dir + " (already exists)");
    }
}

// Convenience wrapper for screenshots
async function snap(p, h, t) { // page, handle, text
    var fn = dir + pad(idx++,2) + '_' + h.name + t + img_ext;
    return await Promise.all([
        p.screenshot({path: fn}, { fullPage: true, quality: defaults.jpg_quality }),
        console.log('...Saved ' + fn)
    ]);
}

// Zero-pad filename increment integer
function pad(n, w, z) { // number, width, padding char (default: 0)
  z = z || '0';
  n = n + '';
  return n.length >= w ? n : new Array(w - n.length + 1).join(z) + n;
}

// Convenience wrapper: For logging, and for standard load wait time
async function goto(p, u) { // page, url
    console.log('Loading ' + u);
    return await Promise.all([    
        p.goto(u),
        p.waitFor(config.default_time)
    ]);
}

// Data structures
module.exports.config = config;
module.exports.defaults = defaults;

// functions
module.exports.snap = snap;
module.exports.mkdir = mkdir;
module.exports.goto = goto;

// Values
module.exports.config_file = config_file;
module.exports.hostname = hostname;
module.exports.user = user;
module.exports.pass = pass;
module.exports.img_height = img_height;
module.exports.img_width = img_width;
module.exports.img_scale = img_scale;
module.exports.jpg_quality = jpg_quality;
module.exports.img_ext = img_ext;

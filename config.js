/*
** Common configuration for PMM Screenshot
*/

var uf = require('url');

// Default values file
const defaults_file_name = process.env.SNAP_DEFAULTS_FILE || './cfg/defaults.json';
const defaults = require(defaults_file_name);

// Dashboards
const dashboards_file_name = process.env.SNAP_DASHBOARDS_FILE || defaults.dashboards_file;
const dashboards = require(dashboards_file_name);

// Per-server configuration values (cfg/server-*.json)
const cfg_file_name = process.env.SNAP_SRV_CFG_FILE || defaults.config_file;
const server_cfg = require(cfg_file_name);

const hostname = uf.parse(server_cfg.server).hostname; // The PMM URL/server/IP

// Override defaults.json values with env vars, if set
var jpg_quality = Number(process.env.SNAP_JPG_QUALITY) || defaults.jpg_quality; // jpg only

// Prefix is special because it can be empty. Node.js can't distinguish between unset and empty.
var img_pfx = null;
if (typeof process.env.SNAP_IMG_PFX === 'undefined') {
    img_pfx = defaults.img_pfx;
} else if (typeof process.env.SNAP_IMG_PFX === 'string' && process.env.SNAP_IMG_PFX.length === 0) {
    img_pfx = '';
} else if (typeof process.env.SNAP_IMG_PFX === 'string' && process.env.SNAP_IMG_PFX.length > 0) {
    img_pfx = process.env.SNAP_IMG_PFX;
} else {
    console.log("SNAP_IMG_PFX can't be set");
}

var img_ext     = process.env.SNAP_IMG_EXT || defaults.img_ext;
var img_width   = Number(process.env.SNAP_IMG_WIDTH) || defaults.img_width;
var img_height  = Number(process.env.SNAP_IMG_HEIGHT) || defaults.img_height;
var img_scale   = Number(process.env.SNAP_IMG_SCALE) || defaults.img_scale;

var user        = process.env.SNAP_USER || defaults.user;
var pass        = process.env.SNAP_PASS || defaults.pass;
// Binary options
var img_seq     = ((process.env.SNAP_IMG_SEQ) ? (process.env.SNAP_IMG_SEQ == 'true') : (defaults.img_seq === true));
var headless    = ((process.env.SNAP_HEADLESS) ? (process.env.SNAP_HEADLESS == 'true') : (defaults.headless === true));
var log_in      = ((process.env.SNAP_LOG_IN) ? (process.env.SNAP_LOG_IN == 'true') : (defaults.log_in === true));
var debug       = ((process.env.SNAP_DEBUG) ? (process.env.SNAP_DEBUG == 'true') : (defaults.debug === true));

// Base dir for images
const img_dir = process.env.SNAP_IMG_DIR || defaults.img_dir;

// EXPORTS
//   Data structures
module.exports.dashboards = dashboards.dashboards;
module.exports.defaults = defaults;
//   Values
module.exports.dashboards_version = dashboards.version;
module.exports.server_cfg = server_cfg;
module.exports.cfg_file_name = cfg_file_name;
module.exports.defaults_file_name = defaults_file_name;
module.exports.dashboards_file_name = dashboards_file_name;
module.exports.hostname = hostname;
module.exports.user = user;
module.exports.pass = pass;
module.exports.log_in = log_in;
module.exports.debug = debug;
module.exports.headless = headless;
module.exports.img_height = img_height;
module.exports.img_width = img_width;
module.exports.img_scale = img_scale;
module.exports.img_pfx = img_pfx;
module.exports.img_seq = img_seq;
module.exports.jpg_quality = jpg_quality;
module.exports.img_ext = img_ext;
module.exports.img_dir = img_dir;

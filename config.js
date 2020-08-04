// common configuration
var uf = require('url');

// Default configuration values
const defaults = require('./cfg/defaults.json');
// Dashboard details: URLs and panel IDs
const dashboards = require('./cfg/dashboards.json');

// Per-server configuration values
const cfg_file_name = process.env.SNAP_CONFIG_FILE || defaults.config_file;
const server_cfg = require(cfg_file_name);
const hostname = uf.parse(server_cfg.server).hostname;

// Override defaults.json values with env vars, if set
const jpg_quality = Number(process.env.SNAP_JPG_QUALITY) || defaults.jpg_quality; // jpg only
const user        = process.env.SNAP_USER || defaults.user;
const pass        = process.env.SNAP_PASS || defaults.pass;
const headless    = ((process.env.SNAP_HEADLESS) ? (process.env.SNAP_HEADLESS == 'true') : (defaults.headless === true));
const img_pfx     = process.env.SNAP_IMG_PFX || defaults.img_pfx;
const img_ext     = process.env.SNAP_IMG_EXT || defaults.img_ext;
const img_width   = Number(process.env.SNAP_IMG_WIDTH) || defaults.img_width;
const img_height  = Number(process.env.SNAP_IMG_HEIGHT) || defaults.img_height;
const img_scale   = Number(process.env.SNAP_IMG_SCALE) || defaults.img_scale;

// Base dir for images
var img_dir = process.env.SNAP_IMGDIR || defaults.img_dir;
// Images saved in subdirectories per hostname/resolution/scale under that specified
img_dir = img_dir + '/' + hostname + '/' + img_width + 'x' + img_height + '/' + img_scale + '/';

// EXPORTS
//   Data structures
module.exports.dashboards = dashboards.dashboards;
module.exports.defaults = defaults;
//   Values
module.exports.server_cfg = server_cfg;
module.exports.cfg_file_name = cfg_file_name;
module.exports.hostname = hostname;
module.exports.user = user;
module.exports.pass = pass;
module.exports.headless = headless;
module.exports.img_height = img_height;
module.exports.img_width = img_width;
module.exports.img_scale = img_scale;
module.exports.img_pfx = img_pfx;
module.exports.jpg_quality = jpg_quality;
module.exports.img_ext = img_ext;
module.exports.img_dir = img_dir;

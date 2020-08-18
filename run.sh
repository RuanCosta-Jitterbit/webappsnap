#! env bash
# Wrapper script for auto screen capture using Puppeteer
# Environment variables set here override those in defaults.json
set -a

# PMM Server credentials
# Username. Default: admin
# SNAP_USER=

# Password. Default: admin
# TIP: Set in working env for security
# SNAP_PASS=

# Server config file. Default: ./cfg/config-pmmdemo.json
# SNAP_CONFIG_FILE=

# Snap viewport. Default: 1920x1080
# SNAP_IMG_WIDTH=
# SNAP_IMG_HEIGHT=

# Image filetype (.jpg or .png). Default: jpg
# SNAP_IMG_EXT=.png

# JPG Quality (% value). Default: 100
# SNAP_JPG_QUALITY=

# Image scale factor. Multiplies WIDTH and HEIGHT by this value. Default: 1
# SNAP_IMG_SCALE=

# Image filename prefix. Default 'pmm_'
# SNAP_IMG_PFX=

# Whether to add snap sequence number to image filename. Default: true
# SNAP_IMG_SEQ=false

# Root for images
# Images directory. Default: ${SNAP_IMGDIR}/<PMM server name>/${SNAP_IMG_WIDTH}x${SNAP_IMG_HEIGHT}/${SNAP_IMG_SCALE}/
# (For filenaming, see snap() in utils.js. For directory, see img_dir in config.js)
SNAP_IMGDIR="images/$(date +%Y%m%d)"

# Headless mode. Whether to hide browser while snapping. Default: true
# SNAP_HEADLESS=false

# USAGE
# run.sh [--list] [--dash=<dashboard UID>[,]]
# --list: outputs list of dashboard UIDs then exits.
# --dash: When empty or unset, snaps all PMM dashboards.
# To snap specific dashboards, add them as a comma-separated list to the --dash option.
# All entries in cfg/dashboards.json with matching uid will be snapped, including any
# panel/component entries.
# The login page is snapped independently based on the value for 'login' in the
# server configuration file (SNAP_CONFIG_FILE).

time node snap-pmm-dashboards.js --unhandled-rejections=strict "$@"

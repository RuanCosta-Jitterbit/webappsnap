#! env bash
#
# Wrapper script for auto screen capture using Puppeteer
#
# Environment variables set here override those in defaults.json
#
# USAGE
#
# run.sh [--list] [--login] [--full] [--debug] [--dash=<dashboard UID>[,]]
# --list: output list of dashboard UIDs then exit.
# --login: Go via the login screen (using SNAP_USER/SNAP_PASS) and snap it.
# --full: Also snap container panels unconstrained by default viewport (SNAP_IMG_WIDTH x SNAP_IMG_HEIGHT)
# --dash: When empty or unset, snaps all PMM dashboards.
#         To snap specific dashboards, add them as a comma-separated list to the --dash option.
#         All entries in cfg/dashboards.json with matching uid will be snapped, including any
#         panel/component entries.
# --debug: Lists operating parameters.
# The login page is snapped independently based on the value for 'login' in the
# server configuration file (SNAP_CONFIG_FILE).

set -a

# PMM Server credentials
# Username. Default: admin
# SNAP_USER=

# Password. Default: admin
# SNAP_PASS=

# Server config file. Default: ./cfg/config-pmmdemo.json
# SNAP_CONFIG_FILE=

# Defaults. To cater for changes to element CSS paths (e.g. during Grafana update).
# SNAP_DEFAULTS_FILE=./cfg/defaults-new.json

# Snap viewport. Default: 1920x1080
# See: https://en.wikipedia.org/wiki/Graphics_display_resolution
# SNAP_IMG_WIDTH=1280
# SNAP_IMG_HEIGHT=1080

# Image filetype (.jpg or .png). Default: jpg
# SNAP_IMG_EXT=.png

# JPG Quality (% value). Default: 100
# SNAP_JPG_QUALITY=75

# Image scale factor. Multiplies WIDTH and HEIGHT by this value. Default: 1
# SNAP_IMG_SCALE=0.5

# Image filename prefix. Default 'PMM_'
# SNAP_IMG_PFX=

# Whether to add snap sequence number to image filename. Default: true
# SNAP_IMG_SEQ=false

# Root for images
# Images directory. Default: ./images/
# Note: Within this directory, images are placed into directory named:
# <PMM server name>/${SNAP_IMG_WIDTH}x${SNAP_IMG_HEIGHT}/${SNAP_IMG_SCALE}/
# (See snap() in utils.js for subdirectory and file naming.)
SNAP_IMG_DIR="images/$(date +%Y%m%d)/"

# Headless mode. Whether to hide browser while snapping. Default: true
# SNAP_HEADLESS=false

node snap-pmm-dashboards.js --unhandled-rejections=strict "$@"

#! env bash
#
# Wrapper script for auto screen capture using Puppeteer
#
# Environment variables set here override those in defaults.json
#
# USAGE
#
# run.sh [--list] [--full] [--debug] [--dash=<dashboard UID>[,]]
#
#   --list: output list of dashboard UIDs then exit.
#   --full: Also snap container panels unconstrained by default viewport
#          (SNAP_IMG_WIDTH x SNAP_IMG_HEIGHT). Note: This option doubles
#           the total time for snapping.
#   --uid: When empty or unset, snaps all PMM dashboards.
#          To snap specific dashboards, add them as a comma-separated list to the --dash option.
#          All entries in cfg/dashboards.json with matching uid will be snapped, including any
#          panel/component entries.
#   --debug: Lists operating parameters.

set -a

## PMM Server credentials
# Username. Default: admin
# SNAP_USER=

# Password. Default: admin
# SNAP_PASS=

# Log in and snap the login screen. Default=true
# SNAP_LOG_IN=false

# Server config file. Default: ./cfg/server-pmmdemo.json
# SNAP_SRV_CFG_FILE=./cfg/server-test.json

# Dashboard definitions file. Default (for PMM2): ./cfg/dashboards.json
# SNAP_DASHBOARDS_FILE=./cfg/dashboards-pmm1.json

# Default values. Default: ./cfg/defaults.json
# Allows for changes to element CSS paths (e.g. during Grafana updates).
# SNAP_DEFAULTS_FILE=./cfg/defaults-2.10.0.json

# Snap viewport. Default: 1280x720
# See: https://en.wikipedia.org/wiki/Graphics_display_resolution
# Can be overridden per dashboard with the viewport value
# (this is done for Query Analytics)
# SNAP_IMG_WIDTH=1920
# SNAP_IMG_HEIGHT=1080

# Image scale factor. Multiplies WIDTH and HEIGHT by this value. Default: 1
# Use with .jpg file and JPG_QUALITY to reduce image file size
# SNAP_IMG_SCALE=0.5

# JPG Quality (% value). Default: 100
# SNAP_JPG_QUALITY=75

# Image filetype (.jpg or .png). Default: jpg
# SNAP_IMG_EXT=.png

# Primary prefix zero-padded 3-digit snap sequence number to image filename. Default: false
# SNAP_IMG_SEQ=true

# Secondary image filename prefix. Default 'PMM'
# SNAP_IMG_PFX=''

# Images directory. Default: ./images/
# Note: Within this directory, images are placed into directory named:
# <config 'name'>/${SNAP_IMG_WIDTH}x${SNAP_IMG_HEIGHT}x${SNAP_IMG_SCALE}/
# (See snap() in utils.js for subdirectory and file naming.)
SNAP_IMG_DIR="images/$(date +%Y%m%d)/"

# Headless mode. Whether to hide browser while snapping. Default: true
# SNAP_HEADLESS=false

node main.js --unhandled-rejections=strict "$@"

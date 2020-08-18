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

# Server config file - defines URL, snap wait time, whether to log in, server version
SNAP_CONFIG_FILE="./cfg/config-pmmdemo.json"

# Snap viewport
# SNAP_IMG_WIDTH=2560
# SNAP_IMG_HEIGHT=1600

# Image filetype .jpg or .png
# SNAP_IMG_EXT=".png"

# JPG Quality (% value). Default: 100
# SNAP_JPG_QUALITY=75

# Image scale factor. Multiplies WIDTH and HEIGHT by this value. Default: 1
# SNAP_IMG_SCALE=0.5

# Image filename prefix. Default 'pmm_'
SNAP_IMG_PFX=PMM_

# Root for images
# Images saved in ./IMGDIR/WIDTHxHEIGHT/SCALE/
# TEST use today's date as base image dir
SNAP_IMGDIR="images/$(date +%Y%m%d)"

# Headless mode
# SNAP_HEADLESS=false

time node snap-pmm-dashboards.js --unhandled-rejections=strict

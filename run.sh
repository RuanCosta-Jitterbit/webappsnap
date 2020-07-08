#! env bash
# Wrapper script for auto screen capture using Puppeteer
# Environment variables set here override those in defaults.json
set -a

# PMM Server credentials
# SNAP_USER=admin
# TIP: Set in working env for security
# SNAP_PASS=

# Server config file
# SNAP_CONFIG_FILE="./config-local.json"

# Snap viewport
# SNAP_IMG_WIDTH=2560
# SNAP_IMG_HEIGHT=1600

# Image scale factor
# Use in conjunction with quality to reduce filesize for large viewports
# SNAP_IMG_SCALE=0.5

# Image filename prefix
# SNAP_IMG_PFX=

# Image filetype .jpg or .png
# SNAP_IMG_EXT=".png"

# JPG Quality
# SNAP_JPG_QUALITY=75

# Root for images
# Images saved in ./IMGDIR/WIDTHxHEIGHT/SCALE/
# TEST use today's date as base image dir
SNAP_IMGDIR=$(date +%Y%m%d)

# Headless mode
# SNAP_HEADLESS=false

time node snap-pmm-dashboards.js

# TODO use imagemagick to create gif slide show
# Delay in 1/100s
# convert -loop 1 -delay 150 *.jpg pmm-dashboard-slideshow.gif

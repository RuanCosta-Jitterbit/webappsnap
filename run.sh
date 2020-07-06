#! env bash
# Wrapper script for auto screen capture using Puppeteer
# Environment variables set here override those in defaults.json
set -a

# PMM Server credentials (default admin/admin)
# SNAP_USER=admin
# TIP: Set in working env for security
# SNAP_PASS=

# Snap viewport (default 1920x1080)
SNAP_IMG_WIDTH=2560
SNAP_IMG_HEIGHT=1600

# NOTES
# 4:3   : 640×480, 800×600, 960×720, 1024×768,           1280×960, 1400×1050, 1440×1080 , 1600×1200, 1856×1392, 1920×1440, 2048×1536
# 16:10 :                                                1280×800,            1440×900,        1680×1050,       1920×1200,       2560×1600
# 16:9  :                            1024×576, 1152×648, 1280×720, 1366×768,              1600×900,             1920×1080,       2560×1440, 3840×2160

# Image scale factor (default: 1)
# Factor by which to scale snap
# Use in conjunction with quality to reduce filesize for large viewports
SNAP_IMG_SCALE=0.5

# Image filetype .jpg or .png (default jpg)
# SNAP_IMG_EXT=".png"

# JPG Quality (default: 100)
# SNAP_JPG_QUALITY=75

# Root for images (default './images') 
# Images saved in ./IMGDIR/WIDTHxHEIGHT/SCALE/
# TEST use today's date as base image dir
SNAP_IMGDIR=$(date +%Y%m%d)

# Server config file (default ./config.json)
SNAP_CONFIG_FILE="./config-pmmdemo.json"

time node snap-pmm-dashboards.js

# TODO use imagemagick to create gif slide show
# Delay in 1/100s
# convert -loop 1 -delay 150 *.jpg pmm-dashboard-slideshow.gif

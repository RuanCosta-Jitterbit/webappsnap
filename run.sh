#! env bash
# Wrapper script for auto screen capture using Puppeteer TODO use python?
set -a

# PMM Server credentials (default admin/admin)
# USER=admin
# PASS=

# NOTES
# 4:3   : 640×480, 800×600, 960×720, 1024×768,           1280×960, 1400×1050, 1440×1080 , 1600×1200, 1856×1392, 1920×1440, 2048×1536
# 16:10 :                                                1280×800,            1440×900,        1680×1050,       1920×1200,       2560×1600
# 16:9  :                            1024×576, 1152×648, 1280×720, 1366×768,              1600×900,             1920×1080,       2560×1440, 3840×2160

# Size window to WIDTH x HEIGHT (default 1920x1080)
#WIDTH=2560
#HEIGHT=1600

# JPG Quality (default: 100)
#QUALITY=75

# Image scale factor (default: 1)
#SCALE=0.5

# Root for images (default 'images') saved in IMGDIR/WIDTHxHEIGHT/SCALE/
IMGDIR=$(date +%Y%m%d)

time node screen-capture-pmm.js $1

# TODO use imagemagick to create gif slide show
# Delay in 1/100s
# convert -loop 1 -delay 150 *.jpg pmm-dashboard-slideshow.gif

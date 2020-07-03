#! env bash
# Wrapper script for auto screen capture using Puppeteer

set -a

# PMM Server base URL (default: https://pmmdemo.percona.com/)
# URL=

# PMM Server credentials (default admin/admin)
# USER=
# PASS=

# PMM Version [2.8.0 | 2.8.1] (default: 2.8.0)
VERSION=2.8.0

# Size window to WIDTH x HEIGHT (default 1920x1080)

# 4:3 aspect ratio resolutions: 640×480, 800×600, 960×720, 1024×768, 1280×960, 1400×1050, 1440×1080 , 1600×1200, 1856×1392, 1920×1440, and 2048×1536.
# 16:10 aspect ratio resolutions: – 1280×800, 1440×900, 1680×1050, 1920×1200 and 2560×1600.
# 16:9 aspect ratio resolutions: 1024×576, 1152×648, 1280×720, 1366×768, 1600×900, 1920×1080, 2560×1440 and 3840×2160.

WIDTH=2560
HEIGHT=1600


# JPG Quality
QUALITY=75
# Scale images by
SCALE=0.5

node screen-capture-pmm.js


# TODO use imagemagick to create gif slide show
# Delay in 1/100s
# convert -loop 1 -delay 150 *.jpg pmm-dashboard-slideshow.gif

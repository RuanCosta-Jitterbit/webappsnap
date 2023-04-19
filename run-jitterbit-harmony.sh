#! env bash
#
# Wrapper script for auto screen capture of web app pages
#
# Default values are defined in defaults.json
# Environment variables override settings in defaults.json
#
# USAGE
#
# run.sh [--list] [--full] [--debug] [--uid=<page UID>[,]]
#
#   --list: print a list of page UIDs in the specified pages file
#           (SNAP_PAGES_FILE or its default) then exit.
#
#   --full: Also snap container panels unconstrained by default viewport
#          (SNAP_IMG_WIDTH x SNAP_IMG_HEIGHT). Note: This option doubles
#           the total time for snapping.
#
#   --uid: When empty or unset, snaps all defined pages.
#          To snap specific pages, use a single option with a comma-separated list, or
#          multiple options each with a UID.
#          All entries in file specified by SNAP_PAGES_FILE (or its default) with
#          matching uid will be snapped, including any panel/component entries.
#
#   --debug: Prints various operating parameters. Default: 'debug' in defaults file (false)

set -a

## Default values file.
# Default: ./cfg/defaults.json (defined in config.js)
SNAP_DEFAULTS_FILE=./cfg/jitterbit/harmony/defaults.json

## Server config file.
# Default: 'config_file' in defaults file
# SNAP_SRV_CFG_FILE=./cfg/server-test.json
SNAP_SRV_CFG_FILE=./cfg/jitterbit/harmony/server-qa-green.json

## Page definitions file.
# Default: 'pages_file' in defaults file
# SNAP_PAGES_FILE=

## Image base directory.
# Default: 'img_dir' in defaults file
# Note: Within this directory, images are saved to a directory named <server config 'name' field>.
SNAP_IMG_DIR="images/Harmony/$(date +%Y%m%d)/$(date +%H%M)/"

## Snap viewport.
# Default: 'img_width' and 'img_height' in defaults file
# Note: Can be overridden per dashboard or per step
# SNAP_IMG_WIDTH=1280
# SNAP_IMG_HEIGHT=720

## JPG Quality (% value).
# Default: 'jpg_quality' in defaults file
# SNAP_JPG_QUALITY=100

## Image filetype (.jpg or .png).
# Default: 'img_ext' in defaults file
# SNAP_IMG_EXT=.png

## Add zero-padded 3-digit snap sequence number prefix to image filename.
# Default: 'img_seq' in defaults file
# SNAP_IMG_SEQ=true

## Secondary image filename prefix.
# Default: 'img_pfx' in defaults file
# SNAP_IMG_PFX=

## Spaces, dots in filenames are replaced with this character
# Default: 'img_filename_sep' in defaults file
# SNAP_IMG_FILENAME_SEP=

## Replace spaces and dots in filenames with this character
# Default: 'img_filename_sep' in defaults file
# SNAP_IMG_FILENAME_SEP="_"

## Headless mode. Whether to hide browser while snapping.
# Default: 'headless' in defaults file
SNAP_HEADLESS=false

## Slow-motion delay. How many milliseconds between each step.
# Useful with SNAP_HEADLESS mode
# Default: 'slowmo' in defaults file
# SNAP_SLOW_MO=10

node main.js --unhandled-rejections=strict "$@"

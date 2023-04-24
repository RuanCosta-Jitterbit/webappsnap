#! env bash
# Wrapper script for auto screen capture of web app pages
set -a
node main.js --unhandled-rejections=strict "$@"

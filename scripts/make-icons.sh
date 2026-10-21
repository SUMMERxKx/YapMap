#!/bin/sh
# Builds every app icon, splash and favicon from the one mark in assets/brand/yap-mark.svg.
#
#   npm run icons        (needs ImageMagick 7: brew install imagemagick)
#
# Colours come from src/theme/tokens.ts. Re-run this after editing the SVG and commit the PNGs.

set -eu

cd "$(dirname "$0")/.."

MARK=assets/brand/yap-mark.svg
OUT=assets/images
GREEN='#15803D'      # palette.light.green: icon backgrounds and the light splash
DARK_GREEN='#22C55E' # palette.dark.green: the dark splash
OAT='#FAF8F5'        # palette.light.background: the mark on a green icon

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# mark HEIGHT COLOUR FILE: the mark on a transparent background, HEIGHT pixels tall.
# It is drawn large and scaled down so the edges stay smooth at every size.
mark() {
  magick -background none -density 576 "$MARK" -resize "x$1" -fill "$2" -colorize 100 "$3"
}

# centre CANVAS_SIZE BACKGROUND MARK_FILE FILE: a square canvas with the mark in the middle.
centre() {
  magick -size "$1x$1" "xc:$2" "$3" -gravity center -composite "$4"
}

# App icon (Expo Go, web and older Android): the mark at 59% height on a full green square.
mark 600 "$OAT" "$TMP/oat-600.png"
centre 1024 "$GREEN" "$TMP/oat-600.png" "$OUT/icon.png"

# Android adaptive icon. Launchers crop to the middle 66% or so, so the mark stays inside it.
mark 460 "$OAT" "$TMP/oat-460.png"
centre 1024 none "$TMP/oat-460.png" "$OUT/android-icon-foreground.png"
magick -size 1024x1024 "xc:$GREEN" "$OUT/android-icon-background.png"
# Monochrome (Android 13 themed icons): only the shape matters, the system picks the colour.
mark 194 white "$TMP/white-194.png"
centre 432 none "$TMP/white-194.png" "$OUT/android-icon-monochrome.png"

# Splash: the mark alone on the splash background, in the green of each colour scheme.
mark 738 "$GREEN" "$OUT/splash-icon.png"
mark 738 "$DARK_GREEN" "$OUT/splash-icon-dark.png"

# Favicon: a small rounded green tile, drawn at 8x and scaled down to 48 px.
magick -size 384x384 xc:none -fill "$GREEN" -draw "roundrectangle 0,0 383,383 84,84" "$TMP/tile.png"
mark 236 "$OAT" "$TMP/oat-236.png"
magick "$TMP/tile.png" "$TMP/oat-236.png" -gravity center -composite -resize 48x48 "$OUT/favicon.png"

# iOS (Xcode 26 Icon Composer): the .icon bundle draws the SVG itself over a green fill.
mkdir -p assets/expo.icon/Assets
cp "$MARK" assets/expo.icon/Assets/yap-mark.svg

# Strip timestamps and other metadata so re-running without changes leaves git clean.
for png in "$OUT"/*.png; do
  magick "$png" -strip "$png"
done

echo "Icons written to $OUT and assets/expo.icon"

#!/bin/sh
# Change le numéro de version partout où le cache en dépend : les ?v=… de index.html et VERSION dans sw.js.
# Usage : ./nouvelle-version.sh 8.1
set -e
cd "$(dirname "$0")"
V="$1"
case "$V" in ''|*[!0-9.]*) echo "Usage : ./nouvelle-version.sh 8.1" >&2; exit 1 ;; esac
sed -i '' -E "s/\?v=[0-9.]+\"/?v=$V\"/g" index.html
sed -i '' -E "s/^const VERSION = '[0-9.]+';/const VERSION = '$V';/" sw.js
echo "Version $V :"
grep -c "?v=$V\"" index.html | sed 's/^/  index.html : /; s/$/ liens/'
grep "^const VERSION" sw.js | sed 's/^/  sw.js : /'

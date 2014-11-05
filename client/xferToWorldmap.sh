#!/bin/bash

#
# this is a handy script for transfering the code from the worldmapXBlock repo to the cga-harvard/cga-worldmap
# repo (they must be siblings for this script to work.
#

echo "This script must be run in the cga-worldmap repo which is a sibling to the worldmapXBlock repo"

cp -v ../worldmapXBlock/client/embed.html src/GeoNodePy/geonode/templates/maps/.
cp -rv ../worldmapXBlock/client/images src/geonode-client/app/static/externals/ext/resources/images/default/xblock-images
cp -v ../worldmapXBlock/client/xblocktools.js  src/geonode-client/app/static/externals/ext/resources/.
cp -v ../worldmapXBlock/client/xblock_header.html src/GeoNodePy/geonode/templates/geonode/xblock_header.html


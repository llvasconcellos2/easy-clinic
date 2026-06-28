#!/usr/bin/env bash
# Repair broken patient photos.
#
# The original image binaries were gitignored (app/pictures/*.jpg) and never
# archived, and the Images docs point at the original dev machine's absolute
# paths (/home/leonardo/.../app/pictures). This script:
#   1. generates a placeholder avatar JPEG (ImageMagick, inside the app container),
#   2. copies it to <id>.<ext> for every Images doc (into the bind-mounted
#      src/app/pictures, so files land on the host too),
#   3. rewrites each Images doc's path/_storagePath/versions.original.path to the
#      container storage dir (/src/app/pictures) and fixes size/Content-Length.
#
# Run from the project root:  bash scripts/03-fix-images.sh
set -euo pipefail

DC="docker compose"
PICDIR_HOST="src/app/pictures"
PICDIR_CTR="/src/app/pictures"
PLACEHOLDER="$PICDIR_HOST/_placeholder.jpg"

echo "==> 1/4 generating placeholder avatar (ImageMagick in app container)"
$DC exec -T app sh -c "mkdir -p $PICDIR_CTR && convert -size 240x240 xc:'#e2e6ea' -fill '#9aa3af' \
  -draw 'circle 120,92 120,56' -draw 'ellipse 120,225 78,58 0,360' $PICDIR_CTR/_placeholder.jpg"

PH_SIZE=$(wc -c < "$PLACEHOLDER" | tr -d ' ')
echo "    placeholder size: ${PH_SIZE} bytes"

echo "==> 2/4 exporting Images ids+extensions"
$DC exec -T mongo mongo --quiet meteor --eval \
  'db.Images.find({},{extension:1}).forEach(function(d){print(d._id+" "+(d.extension||"jpg"));})' \
  | tr -d '\r' > /tmp/easyclinic_img_ids.txt
echo "    $(wc -l < /tmp/easyclinic_img_ids.txt) image docs"

echo "==> 3/4 copying placeholder to <id>.<ext>"
copied=0
while read -r id ext; do
  [ -n "$id" ] || continue
  cp "$PLACEHOLDER" "$PICDIR_HOST/$id.$ext"
  copied=$((copied + 1))
done < /tmp/easyclinic_img_ids.txt
echo "    copied: $copied files"

echo "==> 4/4 rewriting Images paths + sizes in MongoDB"
$DC exec -T mongo mongo --quiet meteor --eval "
var dir = '$PICDIR_CTR'; var PH = $PH_SIZE; var n = 0;
db.Images.find({}).forEach(function(d){
  var p = dir + '/' + d._id + '.' + (d.extension || 'jpg');
  db.Images.update({_id: d._id}, { \$set: {
    path: p, _storagePath: dir, size: PH,
    'versions.original.path': p, 'versions.original.size': PH
  }});
  n++;
});
print('updated Images docs: ' + n);
"

echo "Done. Patient photos now serve a placeholder via /cdn/storage/Images/<id>/original/<id>.<ext>"

#!/usr/bin/env bash
# Seed every patient with a distinct, good-looking avatar for demos.
#
# Alternates two free sources per patient (all files stored locally; the app
# already serves them via /cdn/storage, so there are no runtime external links):
#   - randomuser.me : real-looking portrait photos, matched by gender
#   - DiceBear       : illustrated avatars, one unique per patient (seeded by id)
#
# For each patient it places a JPG/PNG in src/app/pictures/<imageId>.<ext>,
# inserts a matching Images doc, and sets patient.picture. It first wipes the
# old shared placeholder photos (and any prior seed, tagged meta.seeded), so it
# is idempotent and safe to re-run.
#
# Run AFTER 06-fix-ages.js, from the project root:
#   bash scripts/07-seed-patient-photos.sh
set -euo pipefail

DC="docker compose"
PICDIR_HOST="src/app/pictures"
PICDIR_CTR="/src/app/pictures"
POOL_DIR=".seed-pool/portraits"   # cached randomuser portraits (gitignored, not served)
DICEBEAR_STYLE="avataaars"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$PICDIR_HOST" "$POOL_DIR"

# 17-char Meteor-style id (UNMISTAKABLE_CHARS).
genid() {
  LC_ALL=C tr -dc '23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz' < /dev/urandom 2>/dev/null | head -c 17 || true
}

echo "==> 1/5 building patient manifest (id + gender, inferring missing genders)"
$DC exec -T mongo mongo --quiet meteor --eval '
var EXC = {"luca":1,"nicola":1,"juca":1,"noah":1,"josue":1};
db.patients.find({}, {name:1, gender:1}).forEach(function (p) {
  var g = p.gender;
  if (g !== "M" && g !== "F") {
    var first = String(p.name || "").trim().toLowerCase().split(/\s+/)[0] || "";
    first = first.replace(/[^\x00-\x7f]/g, "");           // crude deburr
    g = (/a$/.test(first) && !EXC[first]) ? "F" : "M";    // pt-BR: ...a -> female
  }
  print(p._id + "\t" + g);
});' | tr -d '\r' > "$TMP/manifest.txt"
echo "    $(wc -l < "$TMP/manifest.txt" | tr -d ' ') patients"

echo "==> 2/5 caching randomuser portrait pool (100 men + 100 women)"
for sub in men women; do
  for i in $(seq 0 99); do
    f="$POOL_DIR/$sub-$i.jpg"
    if [ ! -s "$f" ]; then
      curl -fsS "https://randomuser.me/api/portraits/$sub/$i.jpg" -o "$f" \
        || echo "    warn: failed to fetch $sub/$i.jpg"
    fi
  done
done
echo "    pool ready: $(ls "$POOL_DIR" | wc -l | tr -d ' ') files"

echo "==> 3/5 generating per-patient images (alternating randomuser / dicebear)"
INSTALL="$TMP/install.txt"
: > "$INSTALL"
idx=0
ru=0; db=0
while IFS=$'\t' read -r pid gender; do
  [ -n "$pid" ] || continue
  imgid="$(genid)"
  if [ $((idx % 2)) -eq 0 ]; then
    # randomuser: gender-matched pool portrait, picked deterministically by id hash
    sub="men"; [ "$gender" = "F" ] && sub="women"
    n=$(( $(printf '%s' "$pid" | cksum | cut -d' ' -f1) % 100 ))
    src="$POOL_DIR/$sub-$n.jpg"
    dst="$PICDIR_HOST/$imgid.jpg"; ext="jpg"; type="image/jpeg"
    cp "$src" "$dst"
    ru=$((ru + 1))
  else
    # dicebear: unique illustrated avatar, deterministic by patient id
    dst="$PICDIR_HOST/$imgid.png"; ext="png"; type="image/png"
    if ! curl -fsS "https://api.dicebear.com/9.x/$DICEBEAR_STYLE/png?seed=$pid&size=240" -o "$dst"; then
      # fallback to a pool portrait so every patient still gets a photo
      sub="men"; [ "$gender" = "F" ] && sub="women"
      n=$(( $(printf '%s' "$pid" | cksum | cut -d' ' -f1) % 100 ))
      dst2="$PICDIR_HOST/$imgid.jpg"; ext="jpg"; type="image/jpeg"
      cp "$POOL_DIR/$sub-$n.jpg" "$dst2"; rm -f "$dst"; dst="$dst2"
      echo "    warn: dicebear failed for $pid, used pool portrait"
    fi
    db=$((db + 1))
  fi
  size="$(wc -c < "$dst" | tr -d ' ')"
  printf '%s\t%s\t%s\t%s\t%s\n' "$pid" "$imgid" "$ext" "$type" "$size" >> "$INSTALL"
  idx=$((idx + 1))
  [ $((idx % 100)) -eq 0 ] && echo "    ...$idx processed"
done < "$TMP/manifest.txt"
echo "    generated $idx images (randomuser: $ru, dicebear: $db)"

echo "==> 4/5 removing old placeholder / prior-seeded image files"
$DC exec -T mongo mongo --quiet meteor --eval \
  'db.Images.find({}, {extension:1}).forEach(function (d) { print(d._id + " " + (d.extension || "jpg")); })' \
  | tr -d '\r' > "$TMP/old.txt"
removed=0
while read -r oid oext; do
  [ -n "$oid" ] || continue
  rm -f "$PICDIR_HOST/$oid.$oext" && removed=$((removed + 1)) || true
done < "$TMP/old.txt"
echo "    removed $removed old files"

echo "==> 5/5 writing Images docs + linking patients in MongoDB"
JS="$TMP/install.js"
{
  echo 'db.Images.remove({});'
  echo 'db.patients.update({}, {$unset:{picture:""}}, {multi:true});'
  echo 'var ins = 0, upd = 0;'
  while IFS=$'\t' read -r pid imgid ext type size; do
    p="$PICDIR_CTR/$imgid.$ext"
    cat <<EOF
db.Images.insert({_id:"$imgid",name:"$imgid.$ext",extension:"$ext",path:"$p",meta:{seeded:true},type:"$type",size:$size,versions:{original:{path:"$p",size:$size,type:"$type",extension:"$ext"}},isVideo:false,isAudio:false,isImage:true,isText:false,isJSON:false,isPDF:false,_storagePath:"$PICDIR_CTR",_downloadRoute:"/cdn/storage",_collectionName:"Images"}); ins++;
db.patients.update({_id:"$pid"},{\$set:{picture:"$imgid"}}); upd++;
EOF
  done < "$INSTALL"
  echo 'print("Images inserted: " + ins);'
  echo 'print("patients linked: " + upd);'
  echo 'print("patients with picture: " + db.patients.count({picture:{$exists:true,$ne:null}}));'
} > "$JS"
$DC exec -T mongo mongo --quiet meteor < "$JS"

echo "Done. Reload http://localhost:3000 and open the patient list to see the photos."

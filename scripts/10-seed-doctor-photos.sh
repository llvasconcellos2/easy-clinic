#!/usr/bin/env bash
# Give every doctor (medical_doctor user) a profile photo, reusing the
# gender-matched real portraits already cached by 07-seed-patient-photos.sh
# (.seed-pool/portraits). Gender is inferred from the first name (pt-BR ...a ->
# female). For each doctor it places a JPG in src/app/pictures/<imageId>.jpg,
# inserts a matching Images doc, and sets profile.picture. Only touches doctors
# that don't already have a photo, so it is safe to re-run.
#
# Run AFTER 07-seed-patient-photos.sh (which fills the portrait pool) and
# 09-create-doctors.js:
#   bash scripts/10-seed-doctor-photos.sh
set -euo pipefail

PICDIR_HOST="src/app/pictures"
PICDIR_CTR="/src/app/pictures"
POOL_DIR=".seed-pool/portraits"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$PICDIR_HOST" "$POOL_DIR"

genid() {
  LC_ALL=C tr -dc '23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz' < /dev/urandom 2>/dev/null | head -c 17 || true
}

# Ensure the portrait pool exists (it normally does from script 07).
if [ "$(ls "$POOL_DIR" 2>/dev/null | wc -l | tr -d ' ')" -lt 200 ]; then
  echo "==> portrait pool incomplete, fetching from randomuser.me"
  for sub in men women; do
    for i in $(seq 0 99); do
      f="$POOL_DIR/$sub-$i.jpg"
      [ -s "$f" ] || curl -fsS "https://randomuser.me/api/portraits/$sub/$i.jpg" -o "$f" || echo "    warn: failed $sub/$i"
    done
  done
fi

echo "==> 1/3 listing doctors without a photo (gender inferred from first name)"
docker compose exec -T mongo mongo --quiet meteor --eval '
var EXC = {"luca":1,"nicola":1,"juca":1,"noah":1,"josue":1};
db.users.find({"profile.group":"medical_doctor", isSuperAdmin:{$ne:true}, $or:[{"profile.picture":{$exists:false}},{"profile.picture":null},{"profile.picture":""}]}).forEach(function (u) {
  var first = String(u.profile.firstName || "").trim().toLowerCase().split(/\s+/)[0] || "";
  first = first.replace(/[^\x00-\x7f]/g, "");
  var g = (/a$/.test(first) && !EXC[first]) ? "F" : "M";
  print(u._id + "\t" + g);
});' | tr -d '\r' > "$TMP/doctors.txt"
echo "    $(wc -l < "$TMP/doctors.txt" | tr -d ' ') doctors to photograph"

echo "==> 2/3 assigning gender-matched portraits"
INSTALL="$TMP/install.txt"
: > "$INSTALL"
while IFS=$'\t' read -r uid gender; do
  [ -n "$uid" ] || continue
  sub="men"; [ "$gender" = "F" ] && sub="women"
  n=$(( $(printf '%s' "$uid" | cksum | cut -d' ' -f1) % 100 ))
  imgid="$(genid)"
  dst="$PICDIR_HOST/$imgid.jpg"
  cp "$POOL_DIR/$sub-$n.jpg" "$dst"
  size="$(wc -c < "$dst" | tr -d ' ')"
  printf '%s\t%s\t%s\n' "$uid" "$imgid" "$size" >> "$INSTALL"
done < "$TMP/doctors.txt"
echo "    placed $(wc -l < "$INSTALL" | tr -d ' ') portraits"

echo "==> 3/3 writing Images docs + linking doctors in MongoDB"
JS="$TMP/install.js"
{
  echo 'var ins = 0, upd = 0;'
  while IFS=$'\t' read -r uid imgid size; do
    p="$PICDIR_CTR/$imgid.jpg"
    cat <<EOF
db.Images.insert({_id:"$imgid",name:"$imgid.jpg",extension:"jpg",path:"$p",meta:{seeded:true},type:"image/jpeg",size:$size,versions:{original:{path:"$p",size:$size,type:"image/jpeg",extension:"jpg"}},isVideo:false,isAudio:false,isImage:true,isText:false,isJSON:false,isPDF:false,_storagePath:"$PICDIR_CTR",_downloadRoute:"/cdn/storage",_collectionName:"Images"}); ins++;
db.users.update({_id:"$uid"},{\$set:{"profile.picture":"$imgid"}}); upd++;
EOF
  done < "$INSTALL"
  echo 'print("Images inserted: " + ins);'
  echo 'print("doctors linked: " + upd);'
  echo 'print("doctors with photo now: " + db.users.count({"profile.group":"medical_doctor","profile.picture":{$exists:true,$ne:null,$ne:""}}));'
} > "$JS"
docker compose exec -T mongo mongo --quiet meteor < "$JS"

echo "Done. Reload the app; the doctors list and calendar now show portraits."

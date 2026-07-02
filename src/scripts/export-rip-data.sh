#!/bin/sh
# Export all collections the rip/ static build needs from the running Docker
# mongo into rip/data/*.json (the loop script docs/NoBackendVersion.md §0
# prescribes). Overwrites the existing fixtures — run from the repo root:
#
#   sh src/scripts/export-rip-data.sh
#
# Requires the stack up (docker compose up -d). Images bytes are NOT re-copied
# here (rip/data/images/ already holds them); only the metadata docs are.

set -e
cd "$(dirname "$0")/../.."   # repo root
OUT=rip/data

# "<mongo collection>:<output file>" pairs — file names are what data-source.js fetches
PAIRS="
patients:patients.json
patient-records:patient-records.json
patient-exams:patient-exams.json
appointments:appointments.json
schedule:schedule.json
drugs:drugs.json
icd10:icd10.json
specialties:specialties.json
exam-catalog:exam-catalog.json
document-models:document-models.json
form-models:form-models.json
settings:settings.json
users:users.json
Images:images-meta.json
"

for pair in $PAIRS; do
  coll="${pair%%:*}"
  file="${pair##*:}"
  printf '%-18s -> %s\n' "$coll" "$OUT/$file"
  docker compose exec -T mongo mongoexport --quiet --db meteor \
    --collection "$coll" --jsonArray > "$OUT/$file"
done

echo "done. verify with: node src/scripts/check-rip-data.js"

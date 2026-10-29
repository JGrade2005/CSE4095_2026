#!/usr/bin/env bash
# Builds hangman_lab.zip from hangman_lab/ after checking every required file exists.
set -euo pipefail
cd "$(dirname "$0")"

required=(
  hangman_lab/hangman_client.py
  hangman_lab/lab_report.pdf
  hangman_lab/screenshots/create_game.png
  hangman_lab/screenshots/guess_letter.png
  hangman_lab/screenshots/python_client.png
)

missing=0
for f in "${required[@]}"; do
  if [[ -f "$f" ]]; then echo "  ok       $f"; else echo "  MISSING  $f"; missing=1; fi
done
if (( missing )); then
  echo "Fix the missing files above, then run again."
  exit 1
fi

rm -f hangman_lab.zip
python3 - <<'PY'
import zipfile
from pathlib import Path

with zipfile.ZipFile("hangman_lab.zip", "w", zipfile.ZIP_DEFLATED) as zf:
    for path in sorted(Path("hangman_lab").rglob("*")):
        if path.is_file() and path.name != ".gitkeep" and "__pycache__" not in path.parts:
            zf.write(path)
            print("  added   ", path)
PY
echo "Created hangman_lab.zip"

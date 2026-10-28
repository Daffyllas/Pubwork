#!/bin/sh
# Downloads real-world Microsoft Publisher (.pub) files that are published in public GitHub repositories
# into tests/corpus-extra/<source>/ (not committed), then writes tests/corpus-extra/SOURCES.md.
#   sh tools/fetch-test-files.sh            then: node tools/reader-test.mjs tests/corpus-extra
# Only GitHub is used (git over https), so it works behind strict proxies. Every file is checked:
# it must be an OLE2 file (D0 CF 11 E0) with a "Quill" storage or an "MSPublisher" CompObj inside,
# and files already seen (same SHA-256, also in tests/corpus) are skipped. A PDF or PNG with the same
# name next to a .pub in the source repository is copied too (a reference made by real Publisher).
set -e
cd "$(dirname "$0")/.."
OUT=tests/corpus-extra; TMP=$(mktemp -d); mkdir -p "$OUT"
find "$OUT" -mindepth 1 -maxdepth 1 -type d -exec rm -rf {} + # start clean: the folder is fully generated
MAN="$OUT/.manifest.tsv"; : > "$MAN"
SEEN="$TMP/seen"; : > "$SEEN"
for f in tests/corpus/*.pub; do sha256sum "$f" | cut -d' ' -f1 >> "$SEEN"; done

# Is this file a real Publisher document? OLE2 magic plus the UTF-16 name "Quill" in the directory
# (Publisher 98 and later), or the "MSPublisher" class name in CompObj (older files without Quill).
is_pub() {
  [ "$(head -c 4 "$1" | od -An -tx1 | tr -d ' \n')" = "d0cf11e0" ] || return 1
  LC_ALL=C grep -qaP 'Q\x00u\x00i\x00l\x00l\x00' "$1" || LC_ALL=C grep -qa 'MSPublisher' "$1"
}

# grab <owner/repo> <folder> <licence> [path regex] [ref]
#   Every .pub in the repository (optionally only paths matching the regex), at HEAD or at <ref>.
grab() {
  repo=$1; dir=$2; lic=$3; pat=${4:-.}; ref=${5:-HEAD}
  rm -rf "$TMP/r"
  if [ "$ref" = HEAD ]; then
    git -c gc.auto=0 clone -q --depth 1 --filter=blob:none --no-checkout "https://github.com/$repo.git" "$TMP/r" 2>/dev/null || { echo "skipped $repo"; return; }
  else
    git -c gc.auto=0 clone -q --bare --filter=blob:none "https://github.com/$repo.git" "$TMP/r" 2>/dev/null || { echo "skipped $repo"; return; }
  fi
  branch=$(git -C "$TMP/r" rev-parse --abbrev-ref HEAD 2>/dev/null || echo HEAD)
  [ "$ref" = HEAD ] || branch=$ref
  git -C "$TMP/r" ls-tree -r "$ref" > "$TMP/tree"
  mkdir -p "$OUT/$dir"; n=0
  grep -iP '\.pub$' "$TMP/tree" | cut -f2 | grep -P -- "$pat" | while IFS= read -r path; do
    name=$(basename "$path")
    git -C "$TMP/r" cat-file -p "$ref:$path" > "$TMP/f" 2>/dev/null || continue
    if ! is_pub "$TMP/f"; then echo "  not Publisher: $repo/$path"; continue; fi
    sha=$(sha256sum "$TMP/f" | cut -d' ' -f1)
    if grep -q "$sha" "$SEEN"; then echo "  duplicate: $repo/$path"; continue; fi
    echo "$sha" >> "$SEEN"
    [ -e "$OUT/$dir/$name" ] && name="${sha%"${sha#????????}"}-$name"
    cp "$TMP/f" "$OUT/$dir/$name"
    stem=${path%.*}; refs=""
    for ext in pdf PDF png PNG; do # reference renderings made by Publisher, same name
      if grep -qF "	$stem.$ext" "$TMP/tree"; then
        git -C "$TMP/r" cat-file -p "$ref:$stem.$ext" > "$OUT/$dir/${name%.*}.$ext"; refs="$refs ${name%.*}.$ext"
      fi
    done
    printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$dir/$name" "https://github.com/$repo/blob/$branch/$path" "$lic" "$sha" "$(wc -c < "$TMP/f" | tr -d ' ')" "$refs" >> "$MAN"
    echo "  $repo: $path"
  done
  rm -rf "$TMP/r"
}

# Library and test-suite corpora
grab apache/poi                      apache-poi        "Apache-2.0" '^test-data/publisher/(?!clusterfuzz)'
grab apache/tika                     apache-tika       "Apache-2.0"
grab LibreOffice/core                libreoffice       "MPL-2.0"    '^writerperfect/qa/'
grab aspose-pub/Aspose.PUB-for-.NET  aspose            "MIT"
grab aspose-pub/Aspose.PUB-for-Java  aspose            "MIT"
grab gabriel-vasile/mimetype         mimetype          "MIT"
# Converter projects that keep their own test corpora (often copies of LibreOffice/Tika bug files)
grab Illia-Pol/pubshift              pubshift          "MPL-2.0 (repository); files from LibreOffice Bugzilla, Apache Tika regression corpus and others"
grab zjean/publisher-converter       zjean             "unknown (no licence file)"
grab jhopkins44/AltPublisher         altpublisher      "unknown (no licence file)"
grab PetalCat/pub2pdf                petalcat          "unknown (no licence file)"
grab JeffOffice/jeffpub              jeffpub           "GPL-3.0 (repository)" '^(?!.*/fuzz/)'
grab MatthiasWeier/TestFiles         testfiles         "unknown (no licence file)"
grab RawData/TestFiles               rawdata           "unknown (no licence file)"
rm -rf "$TMP"
find "$OUT" -mindepth 1 -type d -empty -delete

# SOURCES.md from the manifest
{
  echo "# Extra Publisher test files"
  echo
  echo "Downloaded by \`tools/fetch-test-files.sh\` from public GitHub repositories. Not committed: these files belong"
  echo "to their authors; the licence column is the licence of the repository they came from, where known."
  echo "Every file is an OLE2 file with a Quill storage or MSPublisher CompObj, and no two files are the same (SHA-256)."
  echo
  echo "| File | Bytes | Source | Licence | Reference rendering |"
  echo "|---|---:|---|---|---|"
  sort "$MAN" | while IFS='	' read -r file url lic sha size refs; do
    echo "| $file | $size | [$(echo "$url" | sed 's|https://github.com/||; s|/blob/[^/]*/| : |')]($url) | $lic | ${refs:--} |"
  done
} > "$OUT/SOURCES.md"
echo "done: $(wc -l < "$MAN") Publisher files in $OUT"

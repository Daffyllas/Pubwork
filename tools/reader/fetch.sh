#!/bin/sh
# Fetches the sources the Publisher reader is built from, at pinned versions, and applies Pubwork's
# small patches to libmspub. Run once; then ./build.sh makes public/pubreader/pubreader.{mjs,wasm}.
# Needs: git, curl, tar, xz, bzip2, ar (binutils), zstd, and Emscripten (emcc/em++) for build.sh.
set -e
R=$(cd "$(dirname "$0")" && pwd)
cd "$R"
UB=http://archive.ubuntu.com/ubuntu/pool/main
LIBMSPUB_COMMIT=652b2be   # "Resize the correct vector." (libmspub 0.1.4+)

get() { [ -f "dl/$2" ] || curl -fsSL "$1" -o "dl/$2"; echo "$3  dl/$2" | sha256sum -c -; }
mkdir -p dl

# libmspub (MPL-2.0): reads .pub files
if [ ! -d libmspub ]; then
  git clone -q https://github.com/LibreOffice/libmspub.git libmspub
  git -C libmspub checkout -q $LIBMSPUB_COMMIT
  git -C libmspub apply "$R/libmspub.patch"
fi

# librevenge 0.0.5 (MPL-2.0): the document-callback layer libmspub talks to
get $UB/libr/librevenge/librevenge_0.0.5.orig.tar.bz2 librevenge.tar.bz2 5892ca6796f7a2a93d580832e907e849b19d980b40d326a283b18877ab6de0c5
[ -d librevenge-0.0.5 ] || tar xjf dl/librevenge.tar.bz2

# zlib 1.3: for compressed streams inside .pub files
get $UB/z/zlib/zlib_1.3.dfsg.orig.tar.xz zlib.tar.xz 5eea0322c1c21c75cad3b607ac1c43ff5c71e014b8ac4a34300b5e2b80d02e70
[ -d zlib ] || { mkdir zlib && tar xJf dl/zlib.tar.xz -C zlib --strip-components=1; }

# Boost 1.83 headers only (libmspub uses a few header-only parts)
get $UB/b/boost1.83/libboost1.83-dev_1.83.0-2.1ubuntu3.2_amd64.deb boost.deb 519ecf2c64308527e15b6582955681d192a832250baa4bc424967aaf7d02d68f
if [ ! -d boostx ]; then
  rm -rf dl/deb && mkdir -p dl/deb && (cd dl/deb && ar x ../boost.deb)
  if command -v zstd >/dev/null; then zstd -dqf dl/deb/data.tar.zst -o dl/deb/data.tar
  else python3 -c "import sys,zstandard;zstandard.ZstdDecompressor().copy_stream(open(sys.argv[1],'rb'),open(sys.argv[2],'wb'))" dl/deb/data.tar.zst dl/deb/data.tar \
    || { echo "Install zstd (or: pip install zstandard) to unpack the Boost headers"; exit 1; }; fi
  mkdir -p boostx && tar xf dl/deb/data.tar -C boostx ./usr/include/boost && rm -rf dl/deb
fi
echo "sources ready in $R; now run ./build.sh"

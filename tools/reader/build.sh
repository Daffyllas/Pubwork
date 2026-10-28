#!/bin/sh
# Run ./fetch.sh first. Builds pubreader.{mjs,wasm}: libmspub + librevenge + zlib + a small ICU stand-in, for the browser.
set -e
P=$(cd "$(dirname "$0")" && pwd)
OUT=${1:-$P/../../public/pubreader}
mkdir -p "$OUT" "$P/obj"
CXXF="-O2 -std=c++17 -DNDEBUG -DLIBMSPUB_BUILD -DLIBREVENGE_BUILD -DLIBREVENGE_STREAM_BUILD -DHAVE_CONFIG_H -I$P/cfg -I$P/shim -I$P/boostx/usr/include -I$P/librevenge-0.0.5/inc -I$P/libmspub/inc -I$P/libmspub/src/lib -I$P/zlib -Wno-everything -fexceptions"
CF="-O2 -DNDEBUG -I$P/zlib -Wno-everything"
objs=""
for f in adler32 crc32 inffast inflate inftrees zutil uncompr deflate trees compress; do
  o=$P/obj/z_$f.o; [ -f $o ] || emcc $CF -c $P/zlib/$f.c -o $o; objs="$objs $o"; done
for f in RVNGBinaryData RVNGProperty RVNGPropertyList RVNGPropertyListVector RVNGString RVNGStringVector RVNGMemoryStream RVNGOLEStream RVNGStreamImplementation RVNGZipStream; do
  o=$P/obj/rv_$f.o; [ -f $o ] || em++ $CXXF -c $P/librevenge-0.0.5/src/lib/$f.cpp -o $o; objs="$objs $o"; done
for src in $P/libmspub/src/lib/*.cpp; do
  f=$(basename $src .cpp); o=$P/obj/ms_$f.o; [ -f $o -a $o -nt $src ] || em++ $CXXF -c $src -o $o; objs="$objs $o"; done
em++ $CXXF -c $P/shim/icushim.cpp -o $P/obj/icushim.o
em++ $CXXF -c $P/bridge/pubjson.cpp -o $P/obj/pubjson.o
em++ -O2 -fexceptions $objs $P/obj/icushim.o $P/obj/pubjson.o \
  -s MODULARIZE=1 -s EXPORT_ES6=1 -s EXPORT_NAME=createPubReader -s ENVIRONMENT=web,worker,node \
  -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=32MB -s MAXIMUM_MEMORY=2GB \
  -s EXPORTED_FUNCTIONS=_pub_convert,_pub_result,_pub_result_size,_malloc,_free -s EXPORTED_RUNTIME_METHODS=HEAPU8,UTF8ToString \
  -o "$OUT/pubreader.mjs"
echo "built $OUT/pubreader.mjs"

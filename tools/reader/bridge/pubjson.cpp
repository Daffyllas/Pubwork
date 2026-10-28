// Bridge between libmspub and the web app: every drawing call libmspub makes is written out as one
// JSON object {"o": call, "p": {properties}} (text as "t"), so the app can rebuild editable pages.
#include <librevenge/librevenge.h>
#include <librevenge-stream/librevenge-stream.h>
#include <libmspub/libmspub.h>
#include <string>
#include <cstring>
#include <cstdlib>

using namespace librevenge;
namespace {
void jsonStr(std::string &o, const char *s) {
  o += '"';
  for (const unsigned char *p = (const unsigned char *)s; *p; ++p) {
    unsigned char c = *p;
    if (c == '"' || c == '\\') { o += '\\'; o += (char)c; }
    else if (c < 0x20) { char b[8]; snprintf(b, sizeof b, "\\u%04x", c); o += b; }
    else o += (char)c;
  }
  o += '"';
}
void props(std::string &o, const RVNGPropertyList &pl);
void vec(std::string &o, const RVNGPropertyListVector &v) {
  o += '[';
  for (unsigned long i = 0; i < v.count(); ++i) { if (i) o += ','; props(o, v[i]); }
  o += ']';
}
void props(std::string &o, const RVNGPropertyList &pl) {
  o += '{';
  bool first = true;
  RVNGPropertyList::Iter i(pl);
  for (i.rewind(); i.next();) {
    if (!first) o += ','; first = false;
    jsonStr(o, i.key()); o += ':';
    if (i.child()) vec(o, *i.child());
    else if (i()) jsonStr(o, i()->getStr().cstr());
    else o += "null";
  }
  o += '}';
}
class JsonPainter : public RVNGDrawingInterface {
public:
  std::string out;
  void call(const char *name, const RVNGPropertyList *pl = nullptr) {
    out += out.empty() ? "[" : ",\n"; out += "{\"o\":\""; out += name; out += '"';
    if (pl) { out += ",\"p\":"; props(out, *pl); }
    out += '}';
  }
#define C0(n) void n() override { call(#n); }
#define C1(n) void n(const RVNGPropertyList &p) override { call(#n, &p); }
  C1(startDocument) C0(endDocument) C1(setDocumentMetaData) C1(defineEmbeddedFont)
  C1(startPage) C0(endPage) C1(startMasterPage) C0(endMasterPage) C1(setStyle) C1(startLayer) C0(endLayer)
  C1(startEmbeddedGraphics) C0(endEmbeddedGraphics) C1(openGroup) C0(closeGroup)
  C1(drawRectangle) C1(drawEllipse) C1(drawPolygon) C1(drawPolyline) C1(drawPath) C1(drawGraphicObject) C1(drawConnector)
  C1(startTextObject) C0(endTextObject) C1(startTableObject) C1(openTableRow) C0(closeTableRow) C1(openTableCell) C0(closeTableCell)
  C1(insertCoveredTableCell) C0(endTableObject) C0(insertTab) C0(insertSpace) C0(insertLineBreak) C1(insertField)
  C1(openOrderedListLevel) C1(openUnorderedListLevel) C0(closeOrderedListLevel) C0(closeUnorderedListLevel)
  C1(openListElement) C0(closeListElement) C1(defineParagraphStyle) C1(openParagraph) C0(closeParagraph)
  C1(defineCharacterStyle) C1(openSpan) C0(closeSpan) C1(openLink) C0(closeLink)
  void insertText(const RVNGString &t) override { out += out.empty() ? "[" : ",\n"; out += "{\"o\":\"insertText\",\"t\":"; jsonStr(out, t.cstr()); out += '}'; }
};
}

static std::string g_result;
extern "C" {
// returns 0 ok, 1 not a Publisher file, 2 could not be read; the JSON is then in pub_result()
int pub_convert(const unsigned char *data, unsigned long size) {
  g_result.clear();
  RVNGStringStream input(data, size);
  if (!libmspub::MSPUBDocument::isSupported(&input)) return 1;
  JsonPainter painter;
  input.seek(0, RVNG_SEEK_SET);
  bool ok = libmspub::MSPUBDocument::parse(&input, &painter);
  g_result = painter.out.empty() ? "[]" : painter.out + "]";
  return ok ? 0 : 2;
}
const char *pub_result() { return g_result.c_str(); }
unsigned long pub_result_size() { return g_result.size(); }
}

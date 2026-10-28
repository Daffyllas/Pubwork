// Tiny replacement for the ICU functions libmspub needs, so the WebAssembly build stays small.
// Single-byte Windows code pages come from tables; double-byte East Asian code pages and anything
// else are decoded by the browser's TextDecoder.
#include "unicode/ucnv.h"
#include "unicode/ucsdet.h"
#include "unicode/uloc.h"
#include "sbtables.h"
#include <string.h>
#include <stdlib.h>
#include <ctype.h>
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
EM_JS(int, js_decode_char, (const char *label, const unsigned char *p, int n), {
  try { const s = new TextDecoder(UTF8ToString(label), { fatal: false }).decode(HEAPU8.subarray(p, p + n)); return s.length ? s.codePointAt(0) : 0xFFFD; } catch (e) { return 0xFFFD; }
});
#else
static int js_decode_char(const char *, const unsigned char *p, int) { return p[0]; }
#endif
struct UConverter { int kind; int cp; const uint16_t *hi; char label[32]; };
enum { K_UTF16LE = 1, K_SB, K_DB, K_LATIN1, K_UTF8 };
static int cpOf(const char *name) { const char *d = name; while (*d && !isdigit((unsigned char)*d)) d++; return atoi(d); }
UConverter *ucnv_open(const char *name, UErrorCode *err) {
  UConverter *c = (UConverter *)calloc(1, sizeof(UConverter));
  if (!name) name = "windows-1252";
  if (!strcasecmp(name, "UTF-16LE")) c->kind = K_UTF16LE;
  else if (!strcasecmp(name, "UTF-8")) c->kind = K_UTF8;
  else {
    int cp = cpOf(name); c->cp = cp;
    for (const SBTable &t : SB_TABLES) if (t.cp == cp) { c->kind = K_SB; c->hi = t.hi; }
    if (!c->kind) {
      const char *lab = cp == 932 ? "shift_jis" : cp == 936 ? "gbk" : cp == 949 ? "euc-kr" : cp == 950 ? "big5" : nullptr;
      if (lab) { c->kind = K_DB; strncpy(c->label, lab, 31); } else c->kind = K_LATIN1;
    }
  }
  *err = U_ZERO_ERROR; return c;
}
void ucnv_close(UConverter *c) { free(c); }
UChar32 ucnv_getNextUChar(UConverter *c, const char **src, const char *limit, UErrorCode *err) {
  const unsigned char *p = (const unsigned char *)*src, *e = (const unsigned char *)limit;
  if (p >= e) { *err = 8; return 0xFFFF; }
  *err = U_ZERO_ERROR;
  switch (c->kind) {
    case K_UTF16LE: {
      if (e - p < 2) { *src = limit; *err = 8; return 0xFFFD; }
      unsigned u = p[0] | (p[1] << 8); p += 2;
      if (u >= 0xD800 && u < 0xDC00 && e - p >= 2) { unsigned l = p[0] | (p[1] << 8); if (l >= 0xDC00 && l < 0xE000) { p += 2; u = 0x10000 + ((u - 0xD800) << 10) + (l - 0xDC00); } }
      *src = (const char *)p; return u;
    }
    case K_UTF8: {
      unsigned b = *p++, u = b; int n = b >= 0xF0 ? 3 : b >= 0xE0 ? 2 : b >= 0xC0 ? 1 : 0; if (n) u = b & (0x3F >> n);
      while (n-- && p < e) u = (u << 6) | (*p++ & 0x3F);
      *src = (const char *)p; return u;
    }
    case K_SB: { unsigned b = *p++; *src = (const char *)p; return b < 0x80 ? b : c->hi[b - 0x80]; }
    case K_DB: {
      unsigned b = *p; int n = 1;
      if (b >= 0x81 && e - p >= 2 && !(c->cp == 932 && b >= 0xA1 && b <= 0xDF)) n = 2;
      UChar32 u = b < 0x80 ? (UChar32)b : js_decode_char(c->label, p, n);
      *src = (const char *)(p + n); return u;
    }
    default: { unsigned b = *p++; *src = (const char *)p; return b; }
  }
}
// Charset detection for Publisher 97/2000 text: a light heuristic instead of ICU's detector.
struct UCharsetDetector { const unsigned char *t; int32_t n; };
struct UCharsetMatch { const char *name; };
static UCharsetMatch MATCH; static const UCharsetMatch *MATCHES[1] = { &MATCH };
UCharsetDetector *ucsdet_open(UErrorCode *err) { *err = 0; return (UCharsetDetector *)calloc(1, sizeof(UCharsetDetector)); }
void ucsdet_close(UCharsetDetector *d) { free(d); }
void ucsdet_setText(UCharsetDetector *d, const char *t, int32_t n, UErrorCode *err) { d->t = (const unsigned char *)t; d->n = n; *err = 0; }
const UCharsetMatch **ucsdet_detectAll(UCharsetDetector *d, int32_t *found, UErrorCode *err) {
  // Old 8-bit text: Latin text with accents has few bytes above 0x7F; Greek and Cyrillic text is mostly
  // such bytes. Greek (1253) and Cyrillic (1251) are told apart by letters common in one and rare in the other.
  long hi = 0, ascii = 0, greek = 0, cyr = 0;
  for (int32_t i = 0; i < d->n; i++) {
    unsigned b = d->t[i];
    if (b < 0x80) { if ((b | 32) >= 'a' && (b | 32) <= 'z') ascii++; continue; }
    hi++;
    if (b == 0xE1 || (b >= 0xDC && b <= 0xDF) || (b >= 0xFC && b <= 0xFE)) greek++;
    if (b == 0xE0 || b == 0xEE || b == 0xE8 || b == 0xE2) cyr++;
  }
  MATCH.name = "ISO-8859-1";
  if (hi >= 4 && hi * 10 > (hi + ascii) * 4) MATCH.name = greek > cyr ? "windows-1253" : "windows-1251";
  *found = 1; *err = 0; return MATCHES;
}
const char *ucsdet_getName(const UCharsetMatch *m, UErrorCode *err) { *err = 0; return m->name; }
// LCID -> locale, for the languages Publisher users most often have
static const struct { uint32_t lcid; const char *loc; } LCIDS[] = {
  {0x0409,"en_US"},{0x0809,"en_GB"},{0x0c09,"en_AU"},{0x1009,"en_CA"},{0x0408,"el_GR"},{0x0407,"de_DE"},{0x0807,"de_CH"},{0x0c07,"de_AT"},
  {0x040c,"fr_FR"},{0x080c,"fr_BE"},{0x0c0c,"fr_CA"},{0x0410,"it_IT"},{0x0c0a,"es_ES"},{0x080a,"es_MX"},{0x0416,"pt_BR"},{0x0816,"pt_PT"},
  {0x0413,"nl_NL"},{0x0813,"nl_BE"},{0x0415,"pl_PL"},{0x0419,"ru_RU"},{0x0422,"uk_UA"},{0x041f,"tr_TR"},{0x0405,"cs_CZ"},{0x040e,"hu_HU"},
  {0x0418,"ro_RO"},{0x0402,"bg_BG"},{0x041a,"hr_HR"},{0x0406,"da_DK"},{0x041d,"sv_SE"},{0x0414,"nb_NO"},{0x040b,"fi_FI"},{0x0411,"ja_JP"},
  {0x0804,"zh_CN"},{0x0404,"zh_TW"},{0x0412,"ko_KR"},{0x040d,"he_IL"},{0x0401,"ar_SA"},{0x041e,"th_TH"}};
int32_t uloc_getLocaleForLCID(uint32_t lcid, char *loc, int32_t cap, UErrorCode *err) {
  for (auto &l : LCIDS) if (l.lcid == lcid) { strncpy(loc, l.loc, cap); *err = 0; return (int32_t)strlen(l.loc); }
  *err = 1; return 0;
}
static int32_t part(const char *loc, int idx, char *out, int32_t cap, UErrorCode *err) {
  const char *s = loc; for (int i = 0; i < idx && s; i++) { s = strchr(s, '_'); if (s) s++; }
  *err = 0; if (!s) { out[0] = 0; return 0; }
  int32_t n = 0; while (s[n] && s[n] != '_' && n < cap - 1) { out[n] = s[n]; n++; } out[n] = 0; return n;
}
int32_t uloc_getLanguage(const char *loc, char *out, int32_t cap, UErrorCode *err) { return part(loc, 0, out, cap, err); }
int32_t uloc_getCountry(const char *loc, char *out, int32_t cap, UErrorCode *err) { return part(loc, 1, out, cap, err); }
int32_t uloc_getScript(const char *, char *out, int32_t, UErrorCode *err) { out[0] = 0; *err = 0; return 0; }

#pragma once
#include "utypes.h"
struct UCharsetDetector; struct UCharsetMatch;
UCharsetDetector *ucsdet_open(UErrorCode *err);
void ucsdet_close(UCharsetDetector *d);
void ucsdet_setText(UCharsetDetector *d, const char *text, int32_t len, UErrorCode *err);
const UCharsetMatch **ucsdet_detectAll(UCharsetDetector *d, int32_t *found, UErrorCode *err);
const char *ucsdet_getName(const UCharsetMatch *m, UErrorCode *err);

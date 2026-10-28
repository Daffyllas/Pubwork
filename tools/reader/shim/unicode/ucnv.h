#pragma once
#include "utypes.h"
struct UConverter;
UConverter *ucnv_open(const char *name, UErrorCode *err);
void ucnv_close(UConverter *c);
UChar32 ucnv_getNextUChar(UConverter *c, const char **src, const char *limit, UErrorCode *err);

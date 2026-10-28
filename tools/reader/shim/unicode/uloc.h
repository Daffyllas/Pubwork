#pragma once
#include "utypes.h"
#define ULOC_FULLNAME_CAPACITY 157
int32_t uloc_getLocaleForLCID(uint32_t lcid, char *locale, int32_t cap, UErrorCode *err);
int32_t uloc_getLanguage(const char *locale, char *out, int32_t cap, UErrorCode *err);
int32_t uloc_getCountry(const char *locale, char *out, int32_t cap, UErrorCode *err);
int32_t uloc_getScript(const char *locale, char *out, int32_t cap, UErrorCode *err);

// Minimal stand-in for the parts of ICU that libmspub uses (see icushim.cpp)
#pragma once
#include <stdint.h>
typedef int UErrorCode;
#define U_ZERO_ERROR 0
#define U_FAILURE(x) ((x) > 0)
#define U_SUCCESS(x) ((x) <= 0)
typedef int32_t UChar32;
typedef uint16_t UChar;

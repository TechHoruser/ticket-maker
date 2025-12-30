/**
 * Xprinter XP-80T Configuration
 * Based on self-test page
 */
const codePages = {
    'PC437': 0, // Std.Europe
    'Katakana': 1,
    'PC850': 2, // Multilingual
    'PC860': 3, // Portugal
    'PC863': 4, // Canadian
    'PC865': 5, // Nordic
    'West Europe': 6,
    'Greek': 7,
    'Hebrew': 8,
    'East Europe': 9,
    'Iran': 10,
    'WPC1252': 16,
    'PC866': 17, // Cyrillic#2
    'PC852': 18, // Latin2
    'PC858_EURO': 19, // Euro
    'IranII': 20,
    'Latvian': 21,
    'Arabic': 22,
    'PT1511251': 23,
    'PC747': 24,
    'WPC1257': 25,
    'Vietnam': 27,
    'PC864': 28,
    'PC1001': 29,
    'Uigur': 30,
    'Hebrew2': 31,
    'WPC1255': 32, // Israel
    'WPC1256': 33,
    'Thai': 255
};

module.exports = {
    codePages
};
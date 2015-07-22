/* jshint node:true */

'use strict';

var path   = require('path');
var glob   = require("glob");
var assign = require('object.assign');

var getParentLocale  = require('./locales').getParentLocale;
var hasCalendars     = require('./locales').hasCalendars;
var normalizeLocale  = require('./locales').normalizeLocale;

module.exports = function extractCalendars(locales) {
    var cache = {};
    var hashes = {};

    // Loads and caches the date calendars for a given `locale` because loading
    // and transforming the data is expensive.
    function getCalendars(locale) {
        var calendars = cache[locale];
        if (calendars) {
            return calendars;
        }

        if (hasCalendars(locale)) {
            calendars = cache[locale] = loadCalendars(locale);
            return calendars;
        }
    }

    // This will traverse the hierarchy for the
    // given `locale` until it finds an ancestor with date calendars.
    function findLocaleWithCalendar(locale) {
        // The "root" locale is the top level ancestor.
        if (locale === 'root') {
            return 'root';
        }

        if (hasCalendars(locale)) {
            return locale;
        }

        // When the `locale` doesn't have calendars data, we need to traverse up
        // its hierarchy to find suitable date calendars data.
        return findLocaleWithCalendar(getParentLocale(locale));
    }

    return locales.reduce(function (calendars, locale) {
        locale = normalizeLocale(locale);

        // Walk the `locale`'s hierarchy to look for suitable ancestor with the
        // date calendars. If no ancestor is found, the given
        // `locale` will be returned.
        var resolvedLocale = findLocaleWithCalendar(locale);

        // Add an entry for the `locale`, which might be an ancestor. If the
        // locale doesn't have relative fields, then we fallback to the "root"
        // locale's fields.
        calendars[locale] = {
            calendars: getCalendars(resolvedLocale),
        };

        return calendars;
    }, {});
};

function loadCalendars(locale) {
    // all NPM packages providing calendars specific data
    var pkgs = [
        "cldr-dates-full",
        "cldr-cal-buddhist-full",
        "cldr-cal-chinese-full",
        "cldr-cal-coptic-full",
        "cldr-cal-dangi-full",
        "cldr-cal-ethiopic-full",
        "cldr-cal-hebrew-full",
        "cldr-cal-indian-full",
        "cldr-cal-islamic-full",
        "cldr-cal-japanese-full",
        "cldr-cal-persian-full",
        "cldr-cal-roc-full"
    ];
    // walking all packages, selecting calendar files, then
    // reading the content of each calendar, and concatenating the set
    return pkgs.reduce(function (calendars, pkgName) {
        var dir = path.resolve(path.dirname(require.resolve(pkgName + '/package.json')), 'main', locale);
        var filenames = glob.sync("ca-*.json", {
                cwd: dir
            });
        return filenames.reduce(function (calendars, filename) {
            return assign(calendars, require(path.join(dir, filename)).main[locale].dates.calendars);
        }, calendars);
    }, {});
}
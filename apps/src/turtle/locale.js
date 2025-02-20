// locale for turtle

import safeLoadLocale from '@cdo/apps/util/safeLoadLocale';
import localeWithI18nStringTracker from '@cdo/apps/util/i18nStringTracker';

let locale = safeLoadLocale('turtle_locale');
locale = localeWithI18nStringTracker(locale, 'turtle');
module.exports = locale;

# פרומפט ההתקנה

מעתיקים את כל הבלוק שבתוך המסגרת ומדביקים לקלוד קוד, בשיחה חדשה. קלוד מבצע את ההתקנה
בעצמו, ואין צורך לגרור קבצים או להריץ פקודות ידנית.

**מה צריך לפני:** Claude Code מותקן, וחיבור לאינטרנט. אם Node חסר, קלוד עוצר בשלב 1
ואומר מה להתקין.

**כמה זמן:** כשתי דקות.

---

```
אתה מתקין לי עכשיו ערכת עבודה. בצע את השלבים לפי הסדר. אל תשאל אותי שאלות שאתה יכול
לענות עליהן בעצמך. אם שלב נכשל, תקן ותמשיך, ורק אם אי אפשר לתקן, עצור ותגיד לי בדיוק
מה נכשל ומה חסר.

שלב 1 · בדיקה
הרץ: npx --version
אם אין npx, עצור ואמור לי בשפה פשוטה מה להתקין ואיפה. אם יש, המשך בלי לשאול אותי כלום.

שלב 2 · שכבת העבודה
npx degit elad-the-cyborg/cyborg-skills/skills/00-foundations/golden-rules ~/.claude/skills/golden-rules
npx degit elad-the-cyborg/cyborg-skills/skills/00-foundations/plan-before-build ~/.claude/skills/plan-before-build
npx degit elad-the-cyborg/cyborg-skills/skills/00-foundations/output-check ~/.claude/skills/output-check
npx degit elad-the-cyborg/cyborg-skills/skills/00-foundations/safety-checkup ~/.claude/skills/safety-checkup
npx degit elad-the-cyborg/cyborg-skills/skills/00-foundations/brand-voice-setup ~/.claude/skills/brand-voice-setup
npx degit elad-the-cyborg/cyborg-skills/skills/02-copy-content/hebrew-copy-refiner ~/.claude/skills/hebrew-copy-refiner

שלב 3 · תכנון וקמפיין
npx degit elad-the-cyborg/cyborg-skills/skills/01-research-strategy/campaign-brief ~/.claude/skills/campaign-brief
npx degit elad-the-cyborg/cyborg-skills/skills/03-creative-visual/brand-palette ~/.claude/skills/brand-palette

שלב 4 · ממומן
npx degit elad-the-cyborg/cyborg-skills/skills/02-copy-content/meta-ads-copy ~/.claude/skills/meta-ads-copy
npx degit elad-the-cyborg/cyborg-skills/skills/03-creative-visual/ad-banner ~/.claude/skills/ad-banner
npx degit elad-the-cyborg/cyborg-skills/skills/05-operations/meta-ads-reader ~/.claude/skills/meta-ads-reader

שלב 5 · אורגני והמרה
npx degit elad-the-cyborg/cyborg-skills/skills/02-copy-content/product-page ~/.claude/skills/product-page
npx degit elad-the-cyborg/cyborg-skills/skills/02-copy-content/seo-article ~/.claude/skills/seo-article
npx degit elad-the-cyborg/cyborg-skills/skills/01-research-strategy/conversion-blockers ~/.claude/skills/conversion-blockers
npx degit elad-the-cyborg/cyborg-skills/skills/02-copy-content/customer-flow ~/.claude/skills/customer-flow

שלב 6 · שכבת ההתנהגות
פתח את ~/.claude/skills/golden-rules/references/claude-md-block.md, קח משם את הבלוק
שמתחיל בכותרת "איך אני רוצה שתעבוד", והוסף אותו לקובץ CLAUDE.md שלי:
- יש כבר CLAUDE.md בתיקייה הזאת או ב-~/.claude/: הוסף בסוף, בלי למחוק כלום ממה שכתוב שם.
- אין קובץ כזה: צור ~/.claude/CLAUDE.md עם הבלוק בלבד.
הצג לי מה הוספת ולאיזה קובץ.

שלב 7 · אימות
ודא בפועל שכל 15 התיקיות קיימות ושבכל אחת יש SKILL.md ותיקיית references. הצג לי טבלה
של שם הסקיל ומה הוא עושה במשפט אחד, בעברית, בשפה של תועלת ולא של כלי.
אל תכתוב שמשהו הותקן בהצלחה בלי שבדקת אותו בפועל. אם משהו חסר, אמור מה חסר.

שלב 8 · מה עכשיו
אמור לי שני דברים:
1. שכדי שהסקילים ייטענו צריך לסגור את השיחה הזאת ולפתוח חדשה.
2. שבשיחה החדשה כדאי להתחיל ב: "בוא נבנה את קובץ המוח של העסק שלי".
```

---

## מה מותקן

**שכבת העבודה.** זה מה שמשנה איך קלוד עובד, עוד לפני שמפעילים משהו.

| סקיל | מה זה נותן |
|------|-------------|
| `golden-rules` | עשרים הרגלי עבודה, ובכל הרצה נבחרים רק אלה שרלוונטיים לרגע |
| `plan-before-build` | תוכנית מאושרת לפני שנוגעים בכלום |
| `output-check` | מעבר על תוצר לפני פרסום: מה לא אומת ומה הומצא |
| `safety-checkup` | מפתחות חשופים, סקיל חיצוני, ושאלות אישור שמישהו כיבה |
| `brand-voice-setup` | קובץ המוח של העסק, שכל שאר הסקילים קוראים ממנו |
| `hebrew-copy-refiner` | עברית שנשמעת כאילו אדם כתב אותה |

**העבודה עצמה.**

| סקיל | מה זה נותן |
|------|-------------|
| `campaign-brief` | בריף שכל מי שנוגע בקמפיין עובד לפיו |
| `brand-palette` | צבעים וגופנים קבועים, עם בדיקת קריאות אמיתית |
| `meta-ads-copy` | קופי למודעות פייסבוק ואינסטגרם |
| `ad-banner` | באנרים עם עברית תקינה, כולל אזורים בטוחים בסטורי |
| `meta-ads-reader` | מה מצב הקמפיין, בשורה אחת, עם המספרים מאחורי כל המלצה |
| `product-page` | דף מוצר שגם נמצא בחיפוש וגם סוגר את המכירה |
| `seo-article` | תוכן שמנועי תשובות יכולים לצטט |
| `conversion-blockers` | איפה במשפך מאבדים אנשים, מדורג לפי כמה כסף זה עולה |
| `customer-flow` | נטישת עגלה, אחרי רכישה, בקשת ביקורת וניוזלטר |

## שני דברים שדורשים חיבור

רוב הסקילים עובדים מיד. שניים לא, והם אומרים את זה בעצמם במקום להמציא:
- **`ad-banner`** דורש מפתח לייצור תמונות.
- **`meta-ads-reader`** דורש חיבור לחשבון המודעות.

## למה יש גם בלוק בקובץ CLAUDE.md

סקיל נטען רק כשהתיאור שלו מתאים למה שביקשתם. תשובות כנות ובקרה עצמית צריכות לפעול תמיד,
גם כשלא מפעילים שום סקיל, ולכן הן יושבות בקובץ שנטען בכל שיחה. הבלוק הוא אחת עשרה שורות,
ואפשר לערוך או למחוק אותו בכל רגע.

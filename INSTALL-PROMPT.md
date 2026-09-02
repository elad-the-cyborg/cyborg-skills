# פרומפט ההתקנה · שכבת הבסיס

מעתיקים את כל הבלוק שלמטה ומדביקים לתוך קלוד קוד, בשיחה חדשה. קלוד מבצע את ההתקנה
בעצמו, ואין צורך לגרור קבצים או להריץ פקודות ידנית.

**מה צריך לפני:** Claude Code מותקן, וחיבור לאינטרנט. אם Node לא מותקן על המחשב,
קלוד יגיד את זה בשלב 1 ויסביר מה להתקין.

---

```
אתה מתקין לי עכשיו שכבת עבודה בסיסית. בצע את השלבים לפי הסדר, ואל תעצור באמצע כדי
לשאול אותי שאלות שאתה יכול לענות עליהן בעצמך. אם שלב נכשל, תקן ותמשיך, ורק אם אי
אפשר לתקן, עצור ותגיד לי בדיוק מה נכשל.

שלב 1 · בדיקה
בדוק שיש npx על המחשב (הרץ: npx --version). אם אין, עצור ואמור לי בשפה פשוטה מה
להתקין ואיפה. אם יש, המשך בלי לשאול אותי כלום.

שלב 2 · התקנת הסקילים
התקן את ששת הסקילים האלה. כל אחד בפקודה נפרדת, ואחרי כל אחת ודא שהתיקייה נוצרה:

npx degit elad-the-cyborg/cyborg-skills/skills/00-foundations/golden-rules ~/.claude/skills/golden-rules
npx degit elad-the-cyborg/cyborg-skills/skills/00-foundations/plan-before-build ~/.claude/skills/plan-before-build
npx degit elad-the-cyborg/cyborg-skills/skills/00-foundations/output-check ~/.claude/skills/output-check
npx degit elad-the-cyborg/cyborg-skills/skills/00-foundations/safety-checkup ~/.claude/skills/safety-checkup
npx degit elad-the-cyborg/cyborg-skills/skills/00-foundations/brand-voice-setup ~/.claude/skills/brand-voice-setup
npx degit elad-the-cyborg/cyborg-skills/skills/02-copy-content/hebrew-copy-refiner ~/.claude/skills/hebrew-copy-refiner

שלב 3 · שכבת ההתנהגות
פתח את הקובץ ~/.claude/skills/golden-rules/references/claude-md-block.md, קח ממנו את
הבלוק שמתחיל בכותרת "איך אני רוצה שתעבוד", והוסף אותו לקובץ CLAUDE.md שלי:
- יש כבר CLAUDE.md בתיקייה הזאת או ב-~/.claude/: הוסף את הבלוק בסופו, בלי למחוק כלום
  ממה שכבר כתוב שם.
- אין קובץ כזה: צור ~/.claude/CLAUDE.md עם הבלוק הזה בלבד.
הצג לי מה הוספת ולאיזה קובץ.

שלב 4 · אימות
ודא בפועל שכל שש התיקיות קיימות ושבכל אחת יש קובץ SKILL.md ותיקיית references. הצג
לי טבלה של שם הסקיל ומה הוא עושה במשפט אחד, בעברית, ובשפה של תועלת ולא של כלי.
אל תכתוב "הותקן בהצלחה" על משהו שלא בדקת בפועל.

שלב 5 · מה עכשיו
אמור לי שני דברים:
1. שכדי שהסקילים ייטענו צריך לסגור את השיחה הזאת ולפתוח חדשה.
2. שבשיחה החדשה כדאי להתחיל במשפט: "תעבור איתי על חוקי הזהב שרלוונטיים למה שאני
   עושה עכשיו".
```

---

## מה מותקן, ולמה

| סקיל | מה זה נותן |
|------|-------------|
| `golden-rules` | עשרים הרגלי עבודה, ובכל הרצה נבחרים רק אלה שרלוונטיים לרגע |
| `plan-before-build` | תוכנית מאושרת לפני שנוגעים בכלום, במקום לגלות אחרי שעתיים שנבנה הדבר הלא נכון |
| `output-check` | מעבר על תוצר לפני פרסום: מה לא אומת, מה הומצא, ומה נכתב כאילו נבדק |
| `safety-checkup` | מפתחות חשופים, סקיל חיצוני לפני התקנה, ושאלות אישור שמישהו כיבה |
| `brand-voice-setup` | קובץ המוח של העסק, שכל שאר הסקילים קוראים ממנו |
| `hebrew-copy-refiner` | עברית שנשמעת כאילו אדם כתב אותה, ולא מכונה |

**שכבת ההתנהגות** בקובץ ה-CLAUDE.md היא מה שגורם לתשובות הכנות ולבקרה העצמית לקרות
בכל שיחה, גם כשלא מפעילים שום סקיל. סקיל נטען רק כשהוא רלוונטי, וקובץ המוח נטען תמיד.

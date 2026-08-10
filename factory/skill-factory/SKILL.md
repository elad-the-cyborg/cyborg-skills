---
name: skill-factory
description: >-
  מפעל הסקילים של הסייבורג — בונה סקיל מגנט חדש לפי הסטנדרט. הפעל כשאלעד מבקש "תבנה
  סקיל", "סקיל חדש למאגר", או להוסיף נושא לקטלוג. עובד רק בתוך ריפו cyborg-skills.
license: MIT
---

# מפעל הסקילים · The Cyborg

## מתי
כשבונים סקיל חדש למאגר `cyborg-skills`.

## תהליך
1. קרא את `AUTHORING.md` בשורש הריפו: זה ספר החוקים.
2. אסוף מאלעד: נושא, קטגוריה (מתוך 7 הקטגוריות), title_he, רמה, וביטוי הפעלה. גם
   טיוטה ראשונית של `summary_he` (מה הלקוח מקבל, בלי לחזור על הכותרת) ו-`audience_he`
   (למי זה מתאים).
3. הרץ `npm run new-skill name=... category_slug=... category="..." topic="..." title_he="..." level=... summary_he="..." audience_he="..." writes_files=... sends_external=... touches_live_campaigns=...` (כל הארגומנטים ב-`AUTHORING.md` סעיף 5 חובה).
4. כתוב את גוף הסקיל בעברית לפי המבנה הקבוע ולפי המתודה המקורית של הסייבורג בלבד.
   לעולם לא לפתוח או להעתיק שיטה חיצונית או חומר של צד שלישי כרפרנס.
5. **חזור וקרא את הגוף שכתבת** ועדכן את שלושת דגלי `metadata.safety`
   (`writes_files`, `sends_external`, `touches_live_campaigns`) כך שישקפו בדיוק
   מה שהסקיל עושה בפועל, לא ניחוש משלב 3. אם יש שורה שכותבת קובץ, `writes_files: true`.
6. הרץ `npm run validate` עד שהסקיל ירוק, ואז `npm run build`.
7. הצג לאלעד לאישור. בלי push ובלי deploy בלי אישור מפורש.

## כללי ברזל
מקוריות מהיסוד; read-only/draft-only; הערך ללקוח במרכז; בלי מקף מפריד; MIT.

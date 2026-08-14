/**
 * guide-body.mjs — הופך את גוף ה-Markdown של GUIDE.md למבנה שהאתר מרנדר ככתבה
 * ולא כקישור יוצא ל-GitHub.
 *
 * למה זה קיים בכלל: עד עכשיו catalog.json החזיק רק את המטא של מדריך (כותרת, תקציר,
 * קטגוריה, github_url), והאתר לכן הציג עמוד תקציר עם כפתור "המדריך המלא ב-GitHub".
 * זה תיאר את איפה הקובץ שוכב, לא את מה שהקורא בא בשבילו. מדריך הוא תוכן עריכתי,
 * והמקום שלו הוא בעמוד, בעברית, בלי לשלוח בעל עסק למאגר קוד.
 *
 * הפירוק:
 *   - כותרת H1 מושמטת (title_he בפרונטמטר כבר מחזיק אותה, ואין טעם בכותרת כפולה)
 *   - כל מה שלפני ה-H2 הראשון = intro, הפתיח של הכתבה
 *   - כל H2 = שלב אחד בקרוסלה של העמוד, עם הכותרת שלו והבלוקים שמתחתיה
 *
 * הפלט הוא בלוקים מוכנים ולא Markdown גולמי, כדי שהאתר לא יצטרך מנתח Markdown משלו
 * (ולא תלות חיצונית) רק בשביל שש כתבות. ההמרה ל-HTML קורית כאן, פעם אחת, בזמן בניית
 * הקטלוג: הטקסט עובר escape מלא לפני שמוסיפים תגיות, אז גם אם מדריך עתידי יכיל
 * סוגריים משולשים או אמפרסנד, שום דבר מהתוכן לא יכול להפוך לתגית חיה בעמוד.
 */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }

function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, (ch) => ESCAPES[ch])
}

/**
 * עיצוב בתוך שורה: קוד בגרשיים אחוריים, **מודגש**, [טקסט](כתובת).
 * מעבר יחיד עם ביטוי אחד שמכיל את שלושת הדפוסים, ולא שלוש החלפות בזו אחר זו: ככה
 * כוכבית או סוגריים שנמצאים בתוך מקטע קוד לא יכולים להתפרש כהדגשה או ככתובת, בלי
 * לשתול סימן פנימי בטקסט ולשלוף אותו בחזרה. כל קטע טקסט שאינו התאמה עובר escape
 * מלא, וכל התאמה נבנית מהחלקים שלה אחרי escape משלהם, אז שום דבר מהתוכן לא יכול
 * להפוך לתגית חיה. קישור מתקבל רק ל-http/https: מדריך נכתב אצלנו, אבל אין סיבה
 * שסכמה כמו javascript: תוכל בכלל להגיע לעמוד דרך הצינור הזה.
 */
const INLINE_RE = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g

export function renderInline(text) {
  const src = String(text ?? '')
  let out = ''
  let last = 0
  INLINE_RE.lastIndex = 0
  let match
  while ((match = INLINE_RE.exec(src)) !== null) {
    out += escapeHtml(src.slice(last, match.index))
    if (match[1] !== undefined) {
      out += `<code>${escapeHtml(match[1])}</code>`
    } else if (match[2] !== undefined) {
      out += `<strong>${escapeHtml(match[2])}</strong>`
    } else {
      out += `<a href="${escapeHtml(match[4])}" rel="noopener" target="_blank">${escapeHtml(match[3])}</a>`
    }
    last = match.index + match[0].length
  }
  out += escapeHtml(src.slice(last))
  return out
}

const BULLET_RE = /^[-*]\s+(.*)$/
const NUMBER_RE = /^\d+\.\s+(.*)$/

/**
 * ממיר קטע Markdown לרשימת בלוקים: פסקה, רשימה (מסומנת או ממוספרת), כותרת משנה
 * וקטע קוד. זה כל אוצר המילים שהמדריכים בפועל משתמשים בו, וזו הנקודה: מנתח שמכסה
 * בדיוק את מה שקיים, במקום ספריית Markdown שלמה בשביל שש כתבות. שורות רצופות
 * מתחברות לפסקה אחת, כי עטיפת שורות בקובץ היא החלטת עריכה ולא שבירת שורה שהקורא
 * אמור לראות.
 */
export function parseBlocks(markdown) {
  const lines = String(markdown ?? '').split('\n')
  const blocks = []
  let paragraph = []

  const flush = () => {
    if (paragraph.length === 0) return
    blocks.push({ type: 'p', html: renderInline(paragraph.join(' ')) })
    paragraph = []
  }

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      flush()
      i += 1
      continue
    }

    if (line.trimStart().startsWith('```')) {
      flush()
      const code = []
      i += 1
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        code.push(lines[i])
        i += 1
      }
      i += 1 // מדלג על הגדר הסוגרת
      blocks.push({ type: 'code', text: code.join('\n') })
      continue
    }

    if (/^###\s+/.test(line)) {
      flush()
      blocks.push({ type: 'h3', html: renderInline(line.replace(/^###\s+/, '').trim()) })
      i += 1
      continue
    }

    const ordered = NUMBER_RE.test(line)
    if (ordered || BULLET_RE.test(line)) {
      flush()
      const itemRe = ordered ? NUMBER_RE : BULLET_RE
      const items = []
      while (i < lines.length) {
        const match = lines[i].match(itemRe)
        if (match) {
          items.push(match[1].trim())
        } else if (items.length > 0 && /^\s+\S/.test(lines[i])) {
          // שורת המשך של פריט שנשבר בקובץ, מתחברת חזרה לפריט שלה
          items[items.length - 1] += ` ${lines[i].trim()}`
        } else {
          break
        }
        i += 1
      }
      blocks.push({ type: ordered ? 'ol' : 'ul', items: items.map(renderInline) })
      continue
    }

    paragraph.push(line.trim())
    i += 1
  }

  flush()
  return blocks
}

/**
 * מפצל את גוף המדריך ל-intro ולשלבים לפי כותרות H2, תוך התעלמות מכותרות שנמצאות
 * בתוך קטע קוד: שורה שמתחילה בסולמיות בתוך בלוק קוד היא קוד, לא כותרת.
 */
function splitSections(body) {
  const lines = String(body ?? '').replace(/\r\n/g, '\n').split('\n')
  const sections = []
  let current = { title: null, lines: [] }
  let inFence = false

  for (const line of lines) {
    if (line.trimStart().startsWith('```')) inFence = !inFence
    const heading = inFence ? null : line.match(/^##\s+(.+?)\s*$/)
    if (heading) {
      sections.push(current)
      current = { title: heading[1], lines: [] }
    } else {
      current.lines.push(line)
    }
  }
  sections.push(current)
  return sections
}

/** ספירת מילים גסה לחישוב זמן קריאה. מתעלמת מקטעי קוד ומסימני Markdown. */
export function countWords(body) {
  const text = String(body ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*`>|_-]/g, ' ')
  return text.split(/\s+/).filter(Boolean).length
}

/** זמן קריאה בדקות. 180 מילים לדקה, ורצפה של 2 דקות: "דקה אחת" על מדריך שלם נשמע
 *  כמו הבטחה שהוא ריק, גם כשהחישוב טכנית מגיע לשם. */
export function readMinutes(words) {
  return Math.max(2, Math.round(words / 180))
}

/**
 * ה-API הראשי: גוף GUIDE.md נכנס, מבנה הכתבה יוצא.
 * מדריך בלי אף H2 מחזיר steps ריק ו-intro עם כל הגוף. הוולידטור (validate-guide.mjs)
 * כבר חוסם את המצב הזה בזמן build, אבל הפונקציה הזו לא זורקת עליו: היא טהורה ומחזירה
 * את מה שיש, וההחלטה מה לעשות עם מדריך חסר שלבים שייכת למי שקורא לה.
 */
export function parseGuideBody(body) {
  const withoutTitle = String(body ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/^\s*#\s+.*$/m, '')

  const [introSection, ...stepSections] = splitSections(withoutTitle)
  const words = countWords(withoutTitle)

  return {
    intro: parseBlocks(introSection.lines.join('\n')),
    steps: stepSections.map((section) => ({
      title: section.title,
      blocks: parseBlocks(section.lines.join('\n')),
    })),
    words,
    read_minutes: readMinutes(words),
  }
}

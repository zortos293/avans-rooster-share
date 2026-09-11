/**
 * Build a valid iCalendar (RFC 5545) feed for Avans rooster lessons.
 * Timezone: Europe/Brussels (CET/CEST).
 */

const TZID = "Europe/Brussels";

/** Escape text per RFC 5545. */
function escapeText(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n");
}

/** Fold long lines at 75 octets (approx. chars for ASCII). */
function foldLine(line) {
  const max = 75;
  if (line.length <= max) return line;
  const parts = [];
  let remaining = line;
  parts.push(remaining.slice(0, max));
  remaining = remaining.slice(max);
  while (remaining.length > 0) {
    parts.push(" " + remaining.slice(0, max - 1));
    remaining = remaining.slice(max - 1);
  }
  return parts.join("\r\n");
}

function toLocalStamp(dateStr, timeStr) {
  // date: YYYY-MM-DD, time: HH:MM → YYYYMMDDTHHMMSS
  const [h, m] = timeStr.split(":");
  const compact = dateStr.replace(/-/g, "");
  return `${compact}T${h.padStart(2, "0")}${m.padStart(2, "0")}00`;
}

function uidForLesson(lesson, index) {
  const base = [
    lesson.date,
    lesson.start,
    lesson.end,
    lesson.course_title,
    lesson.room,
    lesson.blokweek,
    index,
  ]
    .join("|")
    .toLowerCase()
    .replace(/[^a-z0-9|]+/g, "-");
  return `${base}@avans-rooster-share`;
}

function dtstampUtc(date = new Date()) {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const mi = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${mo}${d}T${h}${mi}${s}Z`;
}

/** Minimal VTIMEZONE for Europe/Brussels (CET/CEST with EU rules). */
function vtimezoneBrussels() {
  return [
    "BEGIN:VTIMEZONE",
    `TZID:${TZID}`,
    "X-LIC-LOCATION:Europe/Brussels",
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0200",
    "TZNAME:CEST",
    "DTSTART:19700329T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0100",
    "TZNAME:CET",
    "DTSTART:19701025T030000",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];
}

function lessonToVevent(lesson, index, stamp) {
  const summary = lesson.course_title || "Les";
  const location = lesson.room || "";
  const description = [
    lesson.ui_label ? `Blokweek: ${lesson.ui_label}` : `Blokweek ${lesson.blokweek}`,
    lesson.day ? `Dag: ${lesson.day}` : null,
    "Klas: 290ICT1SEVSb",
  ]
    .filter(Boolean)
    .join("\n");

  const lines = [
    "BEGIN:VEVENT",
    `UID:${uidForLesson(lesson, index)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${TZID}:${toLocalStamp(lesson.date, lesson.start)}`,
    `DTEND;TZID=${TZID}:${toLocalStamp(lesson.date, lesson.end)}`,
    `SUMMARY:${escapeText(summary)}`,
  ];
  if (location) lines.push(`LOCATION:${escapeText(location)}`);
  lines.push(`DESCRIPTION:${escapeText(description)}`);
  lines.push("END:VEVENT");
  return lines;
}

/**
 * @param {object[]} lessons - flattened lessons
 * @param {object} [opts]
 * @param {string} [opts.calendarName]
 * @param {string} [opts.prodId]
 */
function buildCalendar(lessons, opts = {}) {
  const calendarName = opts.calendarName || "Avans 290ICT1SEVSb Rooster";
  const prodId = opts.prodId || "-//Avans Rooster Share//NL";
  const stamp = dtstampUtc();

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${prodId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    `X-WR-TIMEZONE:${TZID}`,
    ...vtimezoneBrussels(),
  ];

  lessons.forEach((lesson, index) => {
    lines.push(...lessonToVevent(lesson, index, stamp));
  });

  lines.push("END:VCALENDAR");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}

module.exports = {
  buildCalendar,
  TZID,
  escapeText,
  toLocalStamp,
  uidForLesson,
};

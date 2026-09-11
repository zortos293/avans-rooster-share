const path = require("path");
const express = require("express");
const {
  loadRoster,
  loadDatabasesWeekplanning,
  loadHomework,
  getAllLessons,
  filterLessons,
  getDatedAssignments,
} = require("./lib/data");
const { buildCalendar } = require("./lib/ics");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");

app.use(express.static(path.join(__dirname, "public"), { maxAge: "1h" }));

function absoluteOrigin(req) {
  const proto = req.get("x-forwarded-proto") || req.protocol;
  const host = req.get("x-forwarded-host") || req.get("host");
  return `${proto}://${host}`;
}

app.get("/api/rooster.json", (req, res) => {
  const roster = loadRoster();
  const lessons = filterLessons(getAllLessons(roster), req.query.vak);
  res.setHeader("Cache-Control", "public, max-age=300");
  res.json({
    roster: roster.roster,
    source: roster.source,
    filter: req.query.vak || null,
    lesson_count: lessons.length,
    blokweken: roster.blokweken,
    lessons,
  });
});

app.get("/api/meta.json", (req, res) => {
  const roster = loadRoster();
  const databases = loadDatabasesWeekplanning();
  const homework = loadHomework();
  const deadlines = getDatedAssignments(homework);
  res.setHeader("Cache-Control", "public, max-age=300");
  res.json({
    klas: roster.roster,
    source: roster.source,
    ics_url: `${absoluteOrigin(req)}/rooster.ics`,
    databases,
    deadlines,
    homework_course: homework.course,
  });
});

app.get("/rooster.ics", (req, res) => {
  const roster = loadRoster();
  const lessons = filterLessons(getAllLessons(roster), req.query.vak);
  const vak = req.query.vak ? String(req.query.vak).trim() : "";
  const calName = vak
    ? `Avans 290ICT1SEVSb – ${vak}`
    : "Avans 290ICT1SEVSb Rooster";

  const ics = buildCalendar(lessons, { calendarName: calName });
  const filename = vak
    ? `rooster-${vak.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`
    : "rooster.ics";

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "public, max-age=300");
  res.send(ics);
});

// SPA-ish: serve index for root (static already covers index.html)
app.get("/health", (_req, res) => {
  res.json({ ok: true, klas: "290ICT1SEVSb" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Avans rooster share listening on http://0.0.0.0:${PORT}`);
});

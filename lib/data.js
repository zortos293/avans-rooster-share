const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

function readJson(filename) {
  const full = path.join(DATA_DIR, filename);
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

function loadRoster() {
  return readJson("roosters-week1-5.json");
}

function loadDatabasesWeekplanning() {
  return readJson("databases-weekplanning.json");
}

function loadHomework() {
  return readJson("homework.json");
}

/** Flatten all lessons with blokweek metadata. */
function getAllLessons(roster = loadRoster()) {
  const lessons = [];
  for (const week of roster.blokweken) {
    for (const lesson of week.lessons) {
      lessons.push({
        ...lesson,
        blokweek: week.blokweek,
        ui_label: week.ui_label,
        week_start: week.start_date,
        week_end: week.end_date,
      });
    }
  }
  return lessons;
}

/**
 * Optional filter: ?vak=databases matches course_title case-insensitively.
 * Also accepts aliases like "frontend", "backend", "ppo".
 */
function filterLessons(lessons, vak) {
  if (!vak || !String(vak).trim()) return lessons;
  const needle = String(vak).trim().toLowerCase();
  return lessons.filter((l) => {
    const title = (l.course_title || "").toLowerCase();
    return title.includes(needle);
  });
}

/** Assignments that have a real due date. */
function getDatedAssignments(homework = loadHomework()) {
  return (homework.assignments || [])
    .filter((a) => a.due)
    .map((a) => ({ ...a }))
    .sort((a, b) => new Date(a.due) - new Date(b.due));
}

module.exports = {
  loadRoster,
  loadDatabasesWeekplanning,
  loadHomework,
  getAllLessons,
  filterLessons,
  getDatedAssignments,
};

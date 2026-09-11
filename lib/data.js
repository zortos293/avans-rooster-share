const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

const WEEKPLANNING_SPECS = [
  {
    id: "databases",
    file: "databases-weekplanning.json",
    title: "Databases weekplanning",
    short: "Databases",
  },
  {
    id: "frontend",
    file: "frontend-weekplanning.json",
    title: "Frontend weekplanning",
    short: "Frontend",
  },
  {
    id: "backend",
    file: "backend-weekplanning.json",
    title: "Backend weekplanning",
    short: "Backend",
  },
  {
    id: "ppo",
    file: "ppo-weekplanning.json",
    title: "PPO & beroepsoriëntatie",
    short: "PPO",
  },
  {
    id: "onderzoek",
    file: "onderzoek-weekplanning.json",
    title: "Onderzoek & communicatie",
    short: "Onderzoek",
  },
];

function readJson(filename) {
  const full = path.join(DATA_DIR, filename);
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

function readJsonIfPresent(filename) {
  const full = path.join(DATA_DIR, filename);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

/** Remove local absolute download paths from public payloads. */
function sanitizeWeekplanning(data) {
  if (!data || typeof data !== "object") return data;
  const copy = { ...data };
  delete copy.downloads;
  delete copy.download_directory;
  if (copy.programming_materials) {
    copy.programming_materials = { ...copy.programming_materials };
    // keep presentations names; drop nothing else sensitive
  }
  return copy;
}


function loadClassTodos() {
  const raw = readJsonIfPresent("class-todos.json");
  return Array.isArray(raw) ? raw : [];
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

/** Load all known weekplanning files that exist on disk. */
function loadWeekplannings() {
  return WEEKPLANNING_SPECS.map((spec) => {
    const raw = readJsonIfPresent(spec.file);
    if (!raw) return null;
    return {
      id: spec.id,
      title: spec.title,
      short: spec.short,
      file: spec.file,
      data: sanitizeWeekplanning(raw),
    };
  }).filter(Boolean);
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
  loadClassTodos,
  WEEKPLANNING_SPECS,
  loadRoster,
  loadDatabasesWeekplanning,
  loadHomework,
  loadWeekplannings,
  getAllLessons,
  filterLessons,
  getDatedAssignments,
};

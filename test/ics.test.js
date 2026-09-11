const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  getAllLessons,
  filterLessons,
  loadRoster,
  getDatedAssignments,
  loadHomework,
} = require("../lib/data");
const { buildCalendar, toLocalStamp } = require("../lib/ics");

describe("data", () => {
  it("loads all lessons from seed JSON without inventing extras", () => {
    const roster = loadRoster();
    const lessons = getAllLessons(roster);
    const expected = roster.blokweken.reduce((n, w) => n + w.lessons.length, 0);
    assert.equal(lessons.length, expected);
    assert.ok(lessons.length > 40);
  });

  it("filters by vak=databases", () => {
    const lessons = filterLessons(getAllLessons(), "databases");
    assert.ok(lessons.length >= 4);
    assert.ok(lessons.every((l) => /databases/i.test(l.course_title)));
  });

  it("only returns homework with due dates", () => {
    const dated = getDatedAssignments(loadHomework());
    assert.ok(dated.length >= 3);
    assert.ok(dated.every((a) => a.due));
  });
});

describe("ics", () => {
  it("builds a calendar with VEVENT per lesson", () => {
    const lessons = getAllLessons();
    const ics = buildCalendar(lessons);
    assert.match(ics, /BEGIN:VCALENDAR/);
    assert.match(ics, /END:VCALENDAR/);
    assert.match(ics, /TZID:Europe\/Brussels/);
    assert.match(ics, /BEGIN:VTIMEZONE/);
    const events = (ics.match(/BEGIN:VEVENT/g) || []).length;
    assert.equal(events, lessons.length);
    assert.match(ics, /UID:/);
    assert.match(ics, /DTSTART;TZID=Europe\/Brussels:/);
    assert.match(ics, /LOCATION:/);
    assert.match(ics, /SUMMARY:/);
  });

  it("formats local stamps correctly", () => {
    assert.equal(toLocalStamp("2026-09-11", "09:00"), "20260911T090000");
    assert.equal(toLocalStamp("2026-10-01", "12:30"), "20261001T123000");
  });
});

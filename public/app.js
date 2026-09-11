const DAY_NL = {
  Monday: "Maandag",
  Tuesday: "Dinsdag",
  Wednesday: "Woensdag",
  Thursday: "Donderdag",
  Friday: "Vrijdag",
  Saturday: "Zaterdag",
  Sunday: "Zondag",
};

function formatDateNL(isoDate) {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatDeadline(iso) {
  const d = new Date(iso);
  return d.toLocaleString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupByDay(lessons) {
  const map = new Map();
  for (const lesson of lessons) {
    if (!map.has(lesson.date)) map.set(lesson.date, []);
    map.get(lesson.date).push(lesson);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function currentBlokweek(blokweken) {
  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  for (const w of blokweken) {
    if (iso >= w.start_date && iso <= w.end_date) return w.blokweek;
  }
  return blokweken[0]?.blokweek ?? 1;
}

function renderRooster(blokweken) {
  const tabs = document.getElementById("week-tabs");
  const panels = document.getElementById("week-panels");
  const active = currentBlokweek(blokweken);

  tabs.innerHTML = "";
  panels.innerHTML = "";

  blokweken.forEach((week, i) => {
    const selected = week.blokweek === active;
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "week-tab";
    tab.id = `tab-${week.blokweek}`;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", selected ? "true" : "false");
    tab.setAttribute("aria-controls", `panel-${week.blokweek}`);
    tab.textContent = `Week ${week.blokweek}`;
    tab.addEventListener("click", () => selectWeek(week.blokweek));
    tabs.appendChild(tab);

    const panel = document.createElement("div");
    panel.className = "week-panel";
    panel.id = `panel-${week.blokweek}`;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", `tab-${week.blokweek}`);
    if (!selected) panel.hidden = true;

    const days = groupByDay(week.lessons);
    panel.innerHTML = days
      .map(([date, lessons]) => {
        const dayName = DAY_NL[lessons[0]?.day] || formatDateNL(date);
        return `
          <div class="day-block">
            <p class="day-label">${dayName} · ${date.slice(8, 10)}-${date.slice(5, 7)}</p>
            ${lessons
              .map(
                (l) => `
              <article class="lesson">
                <div class="lesson-time">${l.start}<span>${l.end}</span></div>
                <div>
                  <p class="lesson-title">${escapeHtml(l.course_title)}</p>
                  <p class="lesson-meta">${escapeHtml(l.room || "—")}</p>
                </div>
              </article>`
              )
              .join("")}
          </div>`;
      })
      .join("");

    panels.appendChild(panel);

    // subtle stagger on first paint
    panel.style.animationDelay = `${0.05 * i}s`;
  });
}

function selectWeek(blokweek) {
  document.querySelectorAll(".week-tab").forEach((tab) => {
    const on = tab.id === `tab-${blokweek}`;
    tab.setAttribute("aria-selected", on ? "true" : "false");
  });
  document.querySelectorAll(".week-panel").forEach((panel) => {
    panel.hidden = panel.id !== `panel-${blokweek}`;
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderDatabases(data) {
  const note = document.getElementById("db-note");
  const list = document.getElementById("db-list");
  note.textContent = data.note || data.course || "";

  list.innerHTML = (data.lessons || [])
    .map((les) => {
      const topics = (les.topics_les || []).map((t) => `<li>${escapeHtml(t)}</li>`).join("");
      const ops = (les.opdrachten || []).map((t) => `<li>${escapeHtml(t)}</li>`).join("");
      const extra = les.blok_extra
        ? `<p style="margin-top:0.55rem"><strong>Blok extra</strong> (${les.blok_extra.uren}u): ${(
            les.blok_extra.topics || []
          )
            .map(escapeHtml)
            .join(" · ")}</p>`
        : "";
      return `
        <article class="item">
          <span class="tag">Les ${les.les} · ${escapeHtml(les.date)} · ${les.uren}u</span>
          <h3>${escapeHtml(formatDateNL(les.date))}</h3>
          ${topics ? `<p><strong>Topics</strong></p><ul>${topics}</ul>` : ""}
          ${ops ? `<p style="margin-top:0.45rem"><strong>Opdrachten</strong></p><ul>${ops}</ul>` : ""}
          ${extra}
        </article>`;
    })
    .join("");
}

function renderDeadlines(deadlines) {
  const list = document.getElementById("deadline-list");
  if (!deadlines.length) {
    list.innerHTML = `<p class="empty">Geen deadlines met datum gevonden.</p>`;
    return;
  }
  list.innerHTML = deadlines
    .map(
      (d) => `
      <article class="item">
        <span class="tag">${escapeHtml(d.section || "Opdracht")}</span>
        <h3>${escapeHtml(d.title)}</h3>
        <p class="deadline-due">Deadline: ${escapeHtml(formatDeadline(d.due))}</p>
        ${d.note ? `<p style="margin-top:0.35rem">${escapeHtml(d.note)}</p>` : ""}
      </article>`
    )
    .join("");
}

async function init() {
  const origin = window.location.origin;
  const icsUrl = `${origin}/rooster.ics`;
  const filterUrl = `${origin}/rooster.ics?vak=databases`;

  document.getElementById("ics-url").textContent = icsUrl;
  document.getElementById("ics-filter").textContent = filterUrl;

  document.getElementById("copy-ics").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(icsUrl);
      const btn = document.getElementById("copy-ics");
      const prev = btn.textContent;
      btn.textContent = "Gekopieerd";
      setTimeout(() => {
        btn.textContent = prev;
      }, 1600);
    } catch {
      prompt("Kopieer deze URL:", icsUrl);
    }
  });

  const [roosterRes, metaRes] = await Promise.all([
    fetch("/api/rooster.json"),
    fetch("/api/meta.json"),
  ]);
  const rooster = await roosterRes.json();
  const meta = await metaRes.json();

  renderRooster(rooster.blokweken || []);
  renderDatabases(meta.databases || {});
  renderDeadlines(meta.deadlines || []);
}

init().catch((err) => {
  console.error(err);
  document.getElementById("week-panels").innerHTML =
    `<p class="empty">Kon rooster niet laden.</p>`;
});

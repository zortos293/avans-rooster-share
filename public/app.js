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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatDeadline(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
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
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function listHtml(items, label) {
  if (!items || !items.length) return "";
  return `<p><strong>${escapeHtml(label)}</strong></p><ul>${items
    .map((t) => `<li>${escapeHtml(t)}</li>`)
    .join("")}</ul>`;
}

function hoursLabel(hours) {
  if (hours == null) return "";
  if (typeof hours === "number") return `${hours}u`;
  if (typeof hours === "object") {
    if (hours.total != null) return `${hours.total}u`;
    const parts = [];
    if (hours.A != null) parts.push(`A ${hours.A}u`);
    if (hours.B != null) parts.push(`B ${hours.B}u`);
    return parts.join(" · ");
  }
  return String(hours);
}

/** Databases shape: data.lessons[] with topics_les / opdrachten */
function cardsFromDatabases(data) {
  return (data.lessons || []).map((les) => {
    const tag = [`Les ${les.les}`, les.date, hoursLabel(les.uren)]
      .filter(Boolean)
      .join(" · ");
    const extra = les.blok_extra
      ? `<p style="margin-top:0.55rem"><strong>Blok extra</strong> (${les.blok_extra.uren}u): ${(
          les.blok_extra.topics || []
        )
          .map(escapeHtml)
          .join(" · ")}</p>`
      : "";
    return `
      <article class="item">
        <span class="tag">${escapeHtml(tag)}</span>
        <h3>${escapeHtml(formatDateNL(les.date))}</h3>
        ${listHtml(les.topics_les, "Topics")}
        ${listHtml(les.opdrachten, "Opdrachten")}
        ${extra}
      </article>`;
  });
}

/** Frontend: nested week → lessons */
function cardsFromFrontend(data) {
  const cards = [];
  for (const week of data.weekplanning || []) {
    for (const les of week.lessons || []) {
      const tag = [
        week.week != null ? `Week ${week.week}` : "Assessment",
        week.date,
        les.lesson != null ? `Les ${les.lesson}` : null,
        hoursLabel(les.hours),
      ]
        .filter(Boolean)
        .join(" · ");
      cards.push(`
        <article class="item">
          <span class="tag">${escapeHtml(tag)}</span>
          <h3>${escapeHtml(week.date || `Les ${les.lesson}`)}</h3>
          ${listHtml(les.topics, "Topics")}
          ${listHtml(les.assignments, "Opdrachten")}
        </article>`);
    }
  }
  return cards;
}

/** Backend: flat lessons with A/B topics */
function cardsFromBackend(data) {
  return (data.weekplanning || []).map((les) => {
    const tag = [
      les.lesson != null ? `Les ${les.lesson}` : "Assessment",
      les.date,
      hoursLabel(les.hours),
    ]
      .filter(Boolean)
      .join(" · ");
    return `
      <article class="item">
        <span class="tag">${escapeHtml(tag)}</span>
        <h3>${escapeHtml(les.date || `Les ${les.lesson}`)}</h3>
        ${listHtml(les.A_topics, "Deel A")}
        ${listHtml(les.B_topics, "Deel B")}
      </article>`;
  });
}

/** PPO: week rows with preparation / lesson / homework */
function cardsFromPpo(data) {
  return (data.weekplanning || []).map((row, i) => {
    if (
      !(row.preparation || []).length &&
      !(row.lesson || []).length &&
      !(row.homework || []).length
    ) {
      return "";
    }
    const tag = row.week != null ? `Week ${row.week}` : `Item ${i + 1}`;
    const title =
      (row.lesson && row.lesson[0]) ||
      (row.homework && row.homework[0]) ||
      tag;
    return `
      <article class="item">
        <span class="tag">${escapeHtml(tag)}</span>
        <h3>${escapeHtml(title)}</h3>
        ${listHtml(row.preparation, "Voorbereiding")}
        ${listHtml(row.lesson, "Les")}
        ${listHtml(row.homework, "Huiswerk")}
      </article>`;
  });
}

/** Onderzoek: lesson + topics + assignments */
function cardsFromOnderzoek(data) {
  return (data.weekplanning || []).map((les) => {
    const tag = [
      les.lesson != null ? `Les ${les.lesson}` : "Les",
      les.date,
    ]
      .filter(Boolean)
      .join(" · ");
    return `
      <article class="item">
        <span class="tag">${escapeHtml(tag)}</span>
        <h3>${escapeHtml(les.date || `Les ${les.lesson}`)}</h3>
        ${listHtml(les.topics, "Topics")}
        ${listHtml(les.assignments, "Opdrachten")}
      </article>`;
  });
}

function cardsForWeekplanning(entry) {
  const data = entry.data || {};
  if (entry.id === "databases" || Array.isArray(data.lessons)) {
    return cardsFromDatabases(data);
  }
  if (entry.id === "frontend") return cardsFromFrontend(data);
  if (entry.id === "backend") return cardsFromBackend(data);
  if (entry.id === "ppo") return cardsFromPpo(data);
  if (entry.id === "onderzoek") return cardsFromOnderzoek(data);

  // Fallback: try shapes in order
  if (Array.isArray(data.weekplanning) && data.weekplanning[0]?.A_topics) {
    return cardsFromBackend(data);
  }
  if (Array.isArray(data.weekplanning) && data.weekplanning[0]?.lessons) {
    return cardsFromFrontend(data);
  }
  if (Array.isArray(data.weekplanning) && data.weekplanning[0]?.homework) {
    return cardsFromPpo(data);
  }
  if (Array.isArray(data.weekplanning)) return cardsFromOnderzoek(data);
  return [];
}

function renderWeekplannings(entries) {
  const nav = document.getElementById("vak-nav");
  const host = document.getElementById("weekplanning-sections");
  if (!entries.length) {
    nav.innerHTML = "";
    host.innerHTML = "";
    return;
  }

  nav.innerHTML = entries
    .map(
      (e) =>
        `<a class="vak-link" href="#wp-${escapeHtml(e.id)}">${escapeHtml(
          e.short || e.title
        )}</a>`
    )
    .join("");

  host.innerHTML = entries
    .map((entry) => {
      const data = entry.data || {};
      const subtitle =
        data.module || data.note || data.notes || data.course || "";
      const cards = cardsForWeekplanning(entry).filter(Boolean).join("");
      return `
        <section class="section" id="wp-${escapeHtml(entry.id)}" aria-labelledby="title-${escapeHtml(entry.id)}">
          <div class="section-head">
            <h2 id="title-${escapeHtml(entry.id)}">${escapeHtml(entry.title)}</h2>
            <p>${escapeHtml(subtitle)}</p>
          </div>
          <div class="stack">${cards || `<p class="empty">Geen weekplanning gevonden.</p>`}</div>
        </section>`;
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
  renderWeekplannings(meta.weekplannings || []);
  renderDeadlines(meta.deadlines || []);
}

init().catch((err) => {
  console.error(err);
  document.getElementById("week-panels").innerHTML =
    `<p class="empty">Kon rooster niet laden.</p>`;
});

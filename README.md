# Avans rooster share — 290ICT1SEVSb

Kleine webapp die het klasrooster (Periode 1, Blokweek 1–5) deelt met klasgenoten, inclusief een geldige iCalendar-feed.

**Bron van waarheid:** alleen de JSON-bestanden in `data/`. Er worden geen lessen verzonnen.

## Lokaal draaien

```bash
npm install
npm start
```

Open http://localhost:3000

Handig tijdens ontwikkelen:

```bash
npm run dev    # herstart bij wijzigingen (Node --watch)
npm test       # ICS + data-checks
```

## Endpoints

| URL | Beschrijving |
|-----|--------------|
| `/` | Nederlandse homepage (rooster, Databases-weekplanning, deadlines, deel-instructies) |
| `/rooster.ics` | Volledige agenda-feed (`text/calendar`, Europe/Brussels) |
| `/rooster.ics?vak=databases` | Optioneel filter op vaknaam (substring, case-insensitive) |
| `/api/rooster.json` | Ruwe rooster-JSON (+ optioneel `?vak=`) |
| `/api/meta.json` | Databases-weekplanning + deadlines met datum |
| `/health` | Eenvoudige healthcheck |

## Agenda importeren

1. **Snel:** open de site → **Importeer in agenda** (download `.ics`).
2. **Google Calendar via URL:** Instellingen → Agenda toevoegen → Via URL → plak `https://<host>/rooster.ics`.
3. Werkt ook in Apple Agenda / Outlook (bestand of URL, afhankelijk van de client).

ICS-details: `VCALENDAR` + `VEVENT` met `UID`, `DTSTART`/`DTEND` (`TZID=Europe/Brussels`), `LOCATION`, `SUMMARY`, `DESCRIPTION` (blokweek).

## Railway

App is Nixpacks/Docker-vriendelijk (`package.json` start-script, `Procfile`, `Dockerfile`, `railway.json`).

- `PORT` komt uit de omgeving; de server luistert op `0.0.0.0`.
- Geen secrets / geen auth (publieke klas-share).
- Publieke URL: zie Railway dashboard / gegenereerd domein.

## Data

- `data/roosters-week1-5.json` — lessen Blokweek 1–5 (bron voor ICS)
- `data/databases-weekplanning.json` — LU01.1 Databases
- `data/frontend-weekplanning.json` — LU01.2 Frontend
- `data/backend-weekplanning.json` — LU01.2 Backend
- `data/ppo-weekplanning.json` — LU01.3 PPO / beroepsoriëntatie
- `data/onderzoek-weekplanning.json` — LU01.3 Onderzoek & communicatie
- `data/homework.json` — Brightspace-opdrachten (alleen items met `due` tonen we als deadline)

Weekplanning-bestanden die bestaan worden automatisch op de homepage getoond.

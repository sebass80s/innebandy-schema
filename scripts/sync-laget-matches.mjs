import { mkdir, writeFile } from "node:fs/promises";

const teams = [
  ["A-lag Herrar", "iibkherr"],
  ["A-lag Damer", "IIBKDAM"],
  ["B-lag Herrar/HJ18", "IIBK-HJP-P09"],
  ["DJ20", "Ingelstad-DJ20"],
  ["DJ18", "IIBKDJ18"],
  ["P-12", "IIBKP12"],
  ["F-12/13", "IIBKF1213"],
  ["P-13/14", "IIBKP1314"],
  ["F-14/15/16", "IIBKF141516"],
  ["P-15", "IIBKP15"],
  ["P-16/17", "Ingelstad-P1617"],
  ["P-18", "IIBKP18"],
  ["F-17/18", "IngelstadIBKF17-18"],
  ["PF-19", "Ingelstad-PF-19"],
  ["PF-20", "Ingelstad-PF-20"],
];

function unfoldIcs(text) {
  return text.replace(/\r?\n[ \t]/g, "");
}

function decodeIcs(value = "") {
  return value
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function parseDate(value = "") {
  const raw = value.replace(/^.*:/, "");
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?/);
  if (!match) return null;
  const [, y, m, d, hh = "00", mm = "00", ss = "00"] = match;
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
}

function parseEvents(text) {
  const normalized = unfoldIcs(text);
  const chunks = normalized.split("BEGIN:VEVENT").slice(1);
  return chunks.map((chunk) => {
    const body = chunk.split("END:VEVENT")[0];
    const lines = body.split(/\r?\n/);
    const fields = {};
    for (const line of lines) {
      const colon = line.indexOf(":");
      if (colon < 0) continue;
      const key = line.slice(0, colon).split(";")[0].toUpperCase();
      const value = line.slice(colon + 1);
      if (!(key in fields)) fields[key] = decodeIcs(value);
    }
    return {
      uid: fields.UID ?? "",
      summary: fields.SUMMARY ?? "",
      description: fields.DESCRIPTION ?? "",
      location: fields.LOCATION ?? "",
      start: parseDate(lines.find((line) => line.toUpperCase().startsWith("DTSTART")) ?? ""),
    };
  });
}

function normalize(value) {
  return value
    .toLocaleLowerCase("sv")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9åäö]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyMatch(event, label) {
  const haystack = normalize([event.summary, event.description, event.location].join(" "));
  const isMatch = /\bmatch\b/.test(haystack) || /\bvs\b|\bmot\b/.test(haystack);
  if (!isMatch) return null;

  const summary = event.summary.replace(/^match\s+/i, "").trim();
  const separators = /\s(?:-|–|—|vs\.?|mot)\s/i;
  const sides = summary.split(separators).map((part) => part.trim()).filter(Boolean);
  const homeTeam = sides[0] ?? "";
  const awayTeam = sides.length >= 2 ? sides.slice(1).join(" - ") : "";
  const homeIsIngelstad = normalize(homeTeam).includes("ingelstad");
  const awayIsIngelstad = normalize(awayTeam).includes("ingelstad");

  let isHome = null;
  if (homeIsIngelstad !== awayIsIngelstad) {
    isHome = homeIsIngelstad;
  } else if (/\bhemma(match)?\b/.test(haystack)) {
    isHome = true;
  } else if (/\bborta(match)?\b/.test(haystack)) {
    isHome = false;
  }

  return {
    uid: event.uid,
    start: event.start,
    summary: event.summary,
    location: event.location,
    homeTeam,
    awayTeam,
    isHome,
  };
}

async function fetchTeamCalendar(label, slug) {
  const url = `https://cal.laget.se/${slug}.ics`;
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; IngelstadCalendarSync/1.0)",
      accept: "text/calendar,*/*",
    },
  });

  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

  const ics = await response.text();
  const events = parseEvents(ics);
  const matches = events
    .map((event) => classifyMatch(event, label))
    .filter(Boolean)
    .filter((match) => match.start)
    .sort((a, b) => a.start.localeCompare(b.start));

  console.log(`${label}: ${matches.length} matcher`);
  if (label === "P-18") {
    for (const match of matches) {
      console.log(`P-18 EVENT: ${match.start} | ${match.isHome === null ? "?" : match.isHome ? "H" : "B"} | ${match.summary}`);
    }
  }

  return { id: slug, label, calendarUrl: url, matches };
}

const results = [];
for (const [label, slug] of teams) {
  try {
    results.push(await fetchTeamCalendar(label, slug));
  } catch (error) {
    console.warn(`${label}: kalendern kunde inte hämtas (${error instanceof Error ? error.message : error})`);
    results.push({ id: slug, label, calendarUrl: `https://cal.laget.se/${slug}.ics`, matches: [] });
  }
}

await mkdir("public", { recursive: true });
await writeFile(
  "public/matches.json",
  JSON.stringify({ updatedAt: new Date().toISOString(), teams: results }, null, 2) + "\n",
  "utf8",
);

console.log(`Sparade kalendrar för ${results.length} lag i public/matches.json`);

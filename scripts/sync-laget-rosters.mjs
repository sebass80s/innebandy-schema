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

const PLAYER_ROLES = new Set([
  "utespelare",
  "målvakt",
  "malvakt",
  "spelare",
]);

const LEADER_ROLES = new Set([
  "tränare",
  "tranare",
  "lagledare",
  "administrationsansv.",
  "administrationsansv",
  "ledare",
  "ass. tränare",
  "ass tränare",
]);

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&aring;/gi, "å")
    .replace(/&auml;/gi, "ä")
    .replace(/&ouml;/gi, "ö")
    .replace(/&Aring;/g, "Å")
    .replace(/&Auml;/g, "Ä")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function cleanText(value) {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function looksLikeName(value) {
  if (!value || value.length < 3 || value.length > 80) return false;
  if (/^\d+$/.test(value)) return false;
  if (/^(truppen|om laget|utespelare|målvakter|målvakt|spelare|ledare)$/i.test(value)) return false;
  return /[A-Za-zÅÄÖåäö]/.test(value);
}

function stripLeadingNumber(value) {
  return value.replace(/^\d{1,3}\s+/, "").trim();
}

function parseRoster(html) {
  const lines = cleanText(html);
  const players = [];
  let section = "";

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const lower = raw.toLocaleLowerCase("sv");

    if (/^målvakter?$/.test(lower)) {
      section = "players";
      continue;
    }
    if (/^utespelare$/.test(lower) || /^spelare$/.test(lower)) {
      section = "players";
      continue;
    }
    if (/^ledare$/.test(lower)) {
      section = "leaders";
      continue;
    }

    if (section !== "players") continue;

    // Laget.se commonly renders one row as "12 Förnamn Efternamn" followed by role.
    const role = lines[i + 1]?.toLocaleLowerCase("sv") ?? "";
    if (PLAYER_ROLES.has(role)) {
      const name = stripLeadingNumber(raw);
      if (looksLikeName(name) && !players.includes(name)) players.push(name);
      i += 1;
      continue;
    }

    // Some layouts put name and role in the same text node.
    const sameLine = raw.match(/^(?:\d{1,3}\s+)?(.+?)\s+(Utespelare|Målvakt|Spelare)$/i);
    if (sameLine) {
      const name = stripLeadingNumber(sameLine[1]);
      if (looksLikeName(name) && !players.includes(name)) players.push(name);
      continue;
    }

    if (LEADER_ROLES.has(lower)) section = "leaders";
  }

  return players;
}

async function fetchRoster(label, slug) {
  const url = `https://www.laget.se/${slug}/Troop`;
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; IngelstadRosterSync/1.0)",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const players = parseRoster(html);
  console.log(`${label}: ${players.length} spelare`);

  return {
    id: slug,
    label,
    url,
    players,
  };
}

const results = [];

for (const [label, slug] of teams) {
  try {
    results.push(await fetchRoster(label, slug));
  } catch (error) {
    console.warn(`${label}: kunde inte hämtas (${error instanceof Error ? error.message : error})`);
    results.push({
      id: slug,
      label,
      url: `https://www.laget.se/${slug}/Troop`,
      players: [],
    });
  }
}

const p18 = results.find((team) => team.label === "P-18");
if (!p18 || p18.players.length === 0) {
  throw new Error("P-18 gav ingen läsbar publik trupp. Stoppar så att vi inte deployar en trasig import.");
}

await mkdir("public", { recursive: true });
await writeFile(
  "public/rosters.json",
  JSON.stringify(
    {
      updatedAt: new Date().toISOString(),
      teams: results,
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

console.log(`Sparade ${results.length} lag i public/rosters.json`);

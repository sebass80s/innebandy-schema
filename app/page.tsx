"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Coach,
  Player,
  ScheduleResult,
  generateSchedule,
} from "../lib/schedule";

const DEFAULT_PLAYER_COUNT = 18;
const DEFAULT_COACH_COUNT = 4;
const STORAGE_KEY = "innebandy-schema-v1";
const ALL_MATCH_TEAMS = "__all__";
const LAGET_HELPER = `javascript:(async()=>{try{const raw=await navigator.clipboard.readText();const marker="LAGET-SE-MATCH\\n";if(!raw.startsWith(marker)){alert("Kopiera först en match från Roterande schema.");return;}const names=raw.slice(marker.length).split("\\n").map(s=>s.trim()).filter(Boolean);const norm=s=>s.toLocaleLowerCase("sv").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^a-z0-9åäö ]/gi," ").replace(/\\s+/g," ").trim();const wanted=names.map(n=>({name:n,key:norm(n)}));const boxes=[...document.querySelectorAll('input[type="checkbox"]')];const found=new Set();for(const box of boxes){let node=box;let text="";for(let i=0;i<5&&node;i++,node=node.parentElement){const t=norm(node.innerText||node.textContent||"");if(t.length>text.length)text=t;}for(const item of wanted){if(text.includes(item.key)){box.checked=true;box.dispatchEvent(new Event("change",{bubbles:true}));box.dispatchEvent(new Event("input",{bubbles:true}));found.add(item.name);break;}}}const missing=names.filter(n=>!found.has(n));alert("Markerade "+found.size+" av "+names.length+" spelare."+ (missing.length?"\\nSaknas: "+missing.join(", "):"\\nAlla hittades."));}catch(e){alert("Kunde inte läsa matchtruppen. Kontrollera urklippsbehörighet och försök igen.");}})()`;
const CLUB_LOGO_SRC = "data:image/webp;base64,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";

type SavedState = {
  players: Player[];
  coaches: Coach[];
  matchCount: number;
  homePattern: boolean[];
  playersPerMatch: number;
  result: ScheduleResult | null;
};

type RosterTeam = {
  id: string;
  label: string;
  url: string;
  players: string[];
};

type RosterData = {
  updatedAt: string;
  teams: RosterTeam[];
};

type CalendarMatch = {
  uid: string;
  start: string;
  summary: string;
  location: string;
  homeTeam: string;
  awayTeam: string;
  isHome: boolean | null;
};

type CalendarTeam = {
  id: string;
  label: string;
  calendarUrl: string;
  matches: CalendarMatch[];
};

type MatchCalendarData = {
  updatedAt: string;
  teams: CalendarTeam[];
};

type MatchOccasion = {
  dateKey: string;
  matches: CalendarMatch[];
  isHome: boolean | null;
};


function makePlayers(): Player[] {
  return Array.from({ length: DEFAULT_PLAYER_COUNT }, (_, index) => ({
    id: `player-${index + 1}`,
    name: "",
  }));
}

function makeCoaches(): Coach[] {
  return Array.from({ length: DEFAULT_COACH_COUNT }, (_, index) => ({
    id: `coach-${index + 1}`,
    name: "",
    childId: "",
  }));
}

export default function Home() {
  const [players, setPlayers] = useState<Player[]>(makePlayers);
  const [coaches, setCoaches] = useState<Coach[]>(makeCoaches);
  const [matchCount, setMatchCount] = useState(9);
  const [homePattern, setHomePattern] = useState<boolean[]>([
    true, false, true, false, true, false, true, false, false,
  ]);
  const [playersPerMatch, setPlayersPerMatch] = useState(8);
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [rosterData, setRosterData] = useState<RosterData | null>(null);
  const [matchCalendarData, setMatchCalendarData] = useState<MatchCalendarData | null>(null);
  const [selectedRosterTeam, setSelectedRosterTeam] = useState("IIBKP18");
  const [selectedMatchTeam, setSelectedMatchTeam] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw) as SavedState;
        setPlayers(saved.players);
        setCoaches(saved.coaches);
        setMatchCount(saved.matchCount);
        const legacyHomeCount = (saved as SavedState & { homeMatchCount?: number }).homeMatchCount;
        setHomePattern(
          saved.homePattern ??
            Array.from(
              { length: saved.matchCount },
              (_, index) => index < (legacyHomeCount ?? Math.floor(saved.matchCount / 2)),
            ),
        );
        setPlayersPerMatch(saved.playersPerMatch);
        const savedResult = saved.result;
        const hasCurrentResultShape =
          savedResult &&
          savedResult.matches?.every((match) => typeof match.isHome === "boolean") &&
          savedResult.homeAppearances &&
          savedResult.coachAppearances &&
          savedResult.coachHomeAppearances;
        setResult(hasCurrentResultShape ? savedResult : null);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    fetch("rosters.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Kunde inte läsa trupperna");
        return response.json() as Promise<RosterData>;
      })
      .then((data) => setRosterData(data))
      .catch(() => setRosterData(null));
  }, []);

  useEffect(() => {
    fetch("matches.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Kunde inte läsa matchkalendern");
        return response.json() as Promise<MatchCalendarData>;
      })
      .then((data) => setMatchCalendarData(data))
      .catch(() => setMatchCalendarData(null));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const state: SavedState = {
      players,
      coaches,
      matchCount,
      homePattern,
      playersPerMatch,
      result,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [players, coaches, matchCount, homePattern, playersPerMatch, result, loaded]);

  const playerName = useMemo(
    () => new Map(players.map((player) => [player.id, player.name || "Namnlös"])),
    [players],
  );
  const coachName = useMemo(
    () => new Map(coaches.map((coach) => [coach.id, coach.name || "Namnlös"])),
    [coaches],
  );
  const coachChildren = useMemo(
    () => new Set(coaches.map((coach) => coach.childId).filter(Boolean)),
    [coaches],
  );

  const availableMatchTeams = useMemo(() => {
    const calendarTeam = matchCalendarData?.teams.find(
      (team) => team.id === selectedRosterTeam,
    );
    if (!calendarTeam) return [];

    const variants = new Set<string>();
    for (const match of calendarTeam.matches) {
      if (match.homeTeam.toLocaleLowerCase("sv").includes("ingelstad")) {
        variants.add(match.homeTeam);
      }
      if (match.awayTeam.toLocaleLowerCase("sv").includes("ingelstad")) {
        variants.add(match.awayTeam);
      }
    }
    return [...variants].sort((a, b) => a.localeCompare(b, "sv"));
  }, [matchCalendarData, selectedRosterTeam]);

  const visibleCalendarMatches = useMemo(() => {
    const calendarTeam = matchCalendarData?.teams.find(
      (team) => team.id === selectedRosterTeam,
    );
    if (!calendarTeam) return [];

    const matchTeam =
      selectedMatchTeam ||
      (availableMatchTeams.length === 1 ? availableMatchTeams[0] : availableMatchTeams[0] ?? "");

    if (!matchTeam) return [];

    const matches =
      matchTeam === ALL_MATCH_TEAMS
        ? calendarTeam.matches.filter(
            (match) =>
              availableMatchTeams.includes(match.homeTeam) ||
              availableMatchTeams.includes(match.awayTeam),
          )
        : calendarTeam.matches.filter(
            (match) => match.homeTeam === matchTeam || match.awayTeam === matchTeam,
          );

    return matches.sort((a, b) => a.start.localeCompare(b.start));
  }, [
    matchCalendarData,
    selectedRosterTeam,
    selectedMatchTeam,
    availableMatchTeams,
  ]);

  const visibleMatchOccasions = useMemo<MatchOccasion[]>(() => {
    const grouped = new Map<string, CalendarMatch[]>();

    for (const match of visibleCalendarMatches) {
      const dateKey = match.start.slice(0, 10);
      const current = grouped.get(dateKey) ?? [];
      current.push(match);
      grouped.set(dateKey, current);
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, matches]) => {
        const homeValues = new Set(
          matches
            .map((match) => match.isHome)
            .filter((value): value is boolean => typeof value === "boolean"),
        );

        return {
          dateKey,
          matches,
          isHome: homeValues.size === 1 ? [...homeValues][0] : null,
        };
      });
  }, [visibleCalendarMatches]);


  function updatePlayer(id: string, name: string) {
    setPlayers((current) =>
      current.map((player) => (player.id === id ? { ...player, name } : player)),
    );
    setResult(null);
  }

  function addPlayer() {
    setPlayers((current) => [
      ...current,
      {
        id: `player-${Date.now()}-${current.length + 1}`,
        name: "",
      },
    ]);
    setResult(null);
  }

  function removePlayer(id: string) {
    setPlayers((current) => current.filter((player) => player.id !== id));
    setCoaches((current) =>
      current.map((coach) =>
        coach.childId === id ? { ...coach, childId: "" } : coach,
      ),
    );
    setPlayersPerMatch((current) =>
      Math.min(current, Math.max(2, players.length - 1)),
    );
    setResult(null);
  }

  function updateCoach(id: string, patch: Partial<Coach>) {
    setCoaches((current) =>
      current.map((coach) => (coach.id === id ? { ...coach, ...patch } : coach)),
    );
    setResult(null);
  }

  function addCoach() {
    setCoaches((current) => [
      ...current,
      {
        id: `coach-${Date.now()}-${current.length + 1}`,
        name: "",
        childId: "",
      },
    ]);
    setResult(null);
  }

  function removeCoach(id: string) {
    setCoaches((current) => current.filter((coach) => coach.id !== id));
    setResult(null);
  }

  async function copyMatchForLagetSe(playerIds: string[]) {
    const names = playerIds
      .map((id) => playerName.get(id))
      .filter((name): name is string => Boolean(name));
    const payload = ["LAGET-SE-MATCH", ...names].join("\n");

    try {
      await navigator.clipboard.writeText(payload);
      setError("Matchtruppen är kopierad. Öppna laget.se och kör bokmärket Fyll matchtrupp.");
    } catch {
      setError("Kunde inte kopiera matchtruppen till urklipp.");
    }
  }

  function importSelectedRoster() {
    const team = rosterData?.teams.find((item) => item.id === selectedRosterTeam);
    if (!team || team.players.length < 2) {
      setError("Det finns ingen läsbar trupp för det valda laget just nu.");
      return;
    }

    const importedPlayers = team.players.map((name, index) => ({
      id: `player-imported-${Date.now()}-${index + 1}`,
      name,
    }));

    const calendarTeam = matchCalendarData?.teams.find(
      (item) => item.id === selectedRosterTeam,
    );
    const matchTeam =
      selectedMatchTeam ||
      (availableMatchTeams.length === 1 ? availableMatchTeams[0] : "");
    const selectedMatches =
      calendarTeam?.matches
        .filter((match) => {
          if (!matchTeam) return false;
          if (matchTeam === ALL_MATCH_TEAMS) {
            return (
              availableMatchTeams.includes(match.homeTeam) ||
              availableMatchTeams.includes(match.awayTeam)
            );
          }
          return match.homeTeam === matchTeam || match.awayTeam === matchTeam;
        })
        .map((match) => ({
          ...match,
          isHome:
            matchTeam === ALL_MATCH_TEAMS
              ? availableMatchTeams.includes(match.homeTeam)
              : match.homeTeam === matchTeam
                ? true
                : match.awayTeam === matchTeam
                  ? false
                  : match.isHome,
        })) ?? [];

    const groupedMatches = new Map<string, CalendarMatch[]>();
    for (const match of selectedMatches) {
      const dateKey = match.start.slice(0, 10);
      const current = groupedMatches.get(dateKey) ?? [];
      current.push(match);
      groupedMatches.set(dateKey, current);
    }

    const knownOccasions = [...groupedMatches.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, matches]) => {
        const homeValues = new Set(
          matches
            .map((match) => match.isHome)
            .filter((value): value is boolean => typeof value === "boolean"),
        );
        return {
          dateKey,
          matches,
          isHome: homeValues.size === 1 ? [...homeValues][0] : null,
        };
      });

    setPlayers(importedPlayers);
    setPlayersPerMatch((current) => Math.min(current, importedPlayers.length));
    setCoaches((current) => current.map((coach) => ({ ...coach, childId: "" })));

    if (knownOccasions.length > 0) {
      setMatchCount(knownOccasions.length);
      setHomePattern((current) =>
        knownOccasions.map((occasion, index) => occasion.isHome ?? current[index] ?? false),
      );
    }

    setResult(null);
    setError(
      knownOccasions.length > 0
        ? `Importerade ${team.players.length} spelare och ${knownOccasions.length} speldatum från ${team.label}. Hemma/borta kan ändras manuellt nedan.`
        : `Importerade ${team.players.length} spelare från ${team.label}. Ingen säker matchordning hittades, så hemma/borta lämnas oförändrat.`,
    );
  }

  function handleGenerate() {
    setError("");
    const missingPlayers = players.some((player) => !player.name.trim());
    const missingCoaches = coaches.some(
      (coach) => !coach.name.trim() || !coach.childId,
    );

    if (missingPlayers || missingCoaches) {
      setError("Fyll i alla spelare och koppla varje tränare till sitt barn.");
      return;
    }

    try {
      setResult(
        generateSchedule({
          players,
          coaches,
          matchCount,
          homePattern,
          playersPerMatch,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel.");
    }
  }

  return (
    <main className="shell">
      <header className="hero">
        <div className="hero-copy">
          <div className="eyebrow">Innebandy · rotationsschema</div>
          <h1>Roterande schema</h1>
          <p>
            Skapa ett så jämnt säsongsschema som möjligt. Två tränare följer med
            varje match och deras barn får automatiskt en plats.
          </p>
        </div>
        <div className="hero-brand">
          <img
            className="club-logo"
            src={CLUB_LOGO_SRC}
            alt="Ingelstad IBK"
          />
        </div>
      </header>

      <section className="card settings">
        <div>
          <label htmlFor="matches">Matcher under säsongen</label>
          <input
            id="matches"
            type="number"
            min={1}
            max={50}
            value={matchCount}
            onChange={(event) => {
              const value = Math.max(1, Number(event.target.value));
              setMatchCount(value);
              setHomePattern((current) =>
                Array.from({ length: value }, (_, index) => current[index] ?? false),
              );
              setResult(null);
            }}
          />
        </div>
        <div>
          <label htmlFor="per-match">Barn per match</label>
          <input
            id="per-match"
            type="number"
            min={2}
            max={players.length}
            value={playersPerMatch}
            onChange={(event) => {
              setPlayersPerMatch(Number(event.target.value));
              setResult(null);
            }}
          />
        </div>
        <div className="math-note">
          {matchCount * playersPerMatch} spelarplatser totalt ·{" "}
          {(matchCount * playersPerMatch / players.length).toFixed(1)} per barn i
          snitt
        </div>
      </section>

      <section className="card venue-settings">
        <div className="section-heading">
          <div>
            <span className="step">↕</span>
            <h2>Hemma / borta i spelordning</h2>
          </div>
          <span>{homePattern.filter(Boolean).length} hemmamatcher</span>
        </div>
        <div className="venue-grid">
          {homePattern.map((isHome, index) => {
            const occasion = visibleMatchOccasions[index];
            const opponents = occasion
              ? [...new Set(
                  occasion.matches.flatMap((match) => {
                    const homeIsUs = match.homeTeam.toLocaleLowerCase("sv").includes("ingelstad");
                    const awayIsUs = match.awayTeam.toLocaleLowerCase("sv").includes("ingelstad");
                    if (homeIsUs && awayIsUs) return [];
                    return [homeIsUs ? match.awayTeam : match.homeTeam];
                  }),
                )]
              : [];
            const dateLabel = occasion
              ? new Intl.DateTimeFormat("sv-SE", {
                  day: "numeric",
                  month: "short",
                }).format(new Date(`${occasion.dateKey}T12:00:00`))
              : "";

            return (
            <label className="venue-row" key={index}>
              <span>
                <strong>Match {index + 1}</strong>
                {occasion && (
                  <span className="venue-meta">
                    <small className="venue-date">
                      {dateLabel} · {occasion.matches.length} matcher
                    </small>
                    {opponents.length > 0 && (
                      <small className="venue-opponents">
                        {opponents.join(", ")}
                      </small>
                    )}
                  </span>
                )}
              </span>
              <select
                value={isHome ? "home" : "away"}
                onChange={(event) => {
                  const next = [...homePattern];
                  next[index] = event.target.value === "home";
                  setHomePattern(next);
                  setResult(null);
                }}
              >
                <option value="home">Hemma</option>
                <option value="away">Borta</option>
              </select>
            </label>
            );
          })}
        </div>
      </section>

      <div className="columns">
        <section className="card">
          <div className="section-heading">
            <div>
              <span className="step">1</span>
              <h2>Spelare</h2>
            </div>
            <span>{players.length} barn</span>
          </div>
          <div className="roster-import">
            <select
              value={selectedRosterTeam}
              onChange={(event) => {
                setSelectedRosterTeam(event.target.value);
                setSelectedMatchTeam("");
              }}
              aria-label="Välj lag från Ingelstad IBK"
            >
              {(rosterData?.teams ?? []).map((team) => (
                <option key={team.id} value={team.id} disabled={team.players.length < 2}>
                  {team.label}{team.players.length >= 2 ? ` · ${team.players.length} spelare` : " · ej tillgänglig"}
                </option>
              ))}
            </select>
            {availableMatchTeams.length > 1 && (
              <select
                value={selectedMatchTeam || availableMatchTeams[0]}
                onChange={(event) => setSelectedMatchTeam(event.target.value)}
                aria-label="Välj matchlag"
              >
                {availableMatchTeams.map((teamName) => (
                  <option key={teamName} value={teamName}>
                    {teamName}
                  </option>
                ))}
                <option value={ALL_MATCH_TEAMS}>
                  {availableMatchTeams
                    .map((teamName) => teamName.replace(/^Ingelstad IBK\s+/i, ""))
                    .join(" + ")} · alla matcher
                </option>
              </select>
            )}
            <button
              type="button"
              className="secondary"
              onClick={importSelectedRoster}
              disabled={!rosterData}
            >
              Hämta trupp
            </button>
            <small>
              Hämtar spelare och matchordning från laget.se. Om laget har flera
              matchlag kan du välja ett av dem eller samla alla matcher i samma schema.
              Hemma/borta går fortfarande att ändra manuellt.
            </small>
          </div>

          <div className="player-grid">
            {players.map((player, index) => (
              <div className="name-row" key={player.id}>
                <span>{index + 1}</span>
                <input
                  aria-label={`Spelare ${index + 1}`}
                  value={player.name}
                  placeholder={`Spelare ${index + 1}`}
                  onChange={(event) => updatePlayer(player.id, event.target.value)}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Ta bort ${player.name || `spelare ${index + 1}`}`}
                  onClick={() => removePlayer(player.id)}
                  disabled={players.length <= 2}
                  title={players.length <= 2 ? "Minst två spelare krävs" : "Ta bort spelare"}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="add-button" onClick={addPlayer}>
            + Lägg till spelare
          </button>
        </section>

        <section className="card">
          <div className="section-heading">
            <div>
              <span className="step">2</span>
              <h2>Tränare</h2>
            </div>
            <span>2 per match</span>
          </div>
          <div className="coach-list">
            {coaches.map((coach, index) => (
              <div className="coach-row" key={coach.id}>
                <div className="coach-title">
                  <strong>Tränare {index + 1}</strong>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Ta bort ${coach.name || `tränare ${index + 1}`}`}
                    onClick={() => removeCoach(coach.id)}
                    disabled={coaches.length <= 2}
                    title={coaches.length <= 2 ? "Minst två tränare krävs" : "Ta bort tränare"}
                  >
                    ×
                  </button>
                </div>
                <input
                  value={coach.name}
                  placeholder="Namn"
                  onChange={(event) =>
                    updateCoach(coach.id, { name: event.target.value })
                  }
                />
                <select
                  value={coach.childId}
                  onChange={(event) =>
                    updateCoach(coach.id, { childId: event.target.value })
                  }
                >
                  <option value="">Välj tränarens barn</option>
                  {players.map((player) => (
                    <option
                      key={player.id}
                      value={player.id}
                      disabled={
                        coach.childId !== player.id && coachChildren.has(player.id)
                      }
                    >
                      {player.name || `Spelare ${player.id.split("-")[1]}`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <button type="button" className="add-button" onClick={addCoach}>
            + Lägg till tränare
          </button>

          <button className="generate" onClick={handleGenerate}>
            Generera rättvist schema
          </button>
          {error && <p className="error">{error}</p>}
        </section>
      </div>

      {result && (
        <section className="results">
          <div className="result-header">
            <div>
              <span className="step">3</span>
              <h2>Säsongsschema</h2>
            </div>
            <button className="secondary" onClick={handleGenerate}>
              Slumpa om
            </button>
          </div>

          <div className="stats">
            <div>
              <span>Minst matcher</span>
              <strong>{result.minAppearances}</strong>
            </div>
            <div>
              <span>Flest matcher</span>
              <strong>{result.maxAppearances}</strong>
            </div>
            <div>
              <span>Längsta spelsvit</span>
              <strong>{result.maxPlayStreak}</strong>
            </div>
            <div>
              <span>Längsta vilosvit</span>
              <strong>{result.maxRestStreak}</strong>
            </div>
          </div>

          <section className="laget-helper card">
            <div>
              <strong>Laget.se-hjälpare</strong>
              <span>
                Dra länken till bokmärkesfältet en gång. Kopiera sedan en match nedan och
                kör bokmärket på deltagarsidan i laget.se.
              </span>
            </div>
            <a className="bookmarklet" href={LAGET_HELPER}>
              Fyll matchtrupp
            </a>
          </section>

          <div className="schedule-list">
            {result.matches.map((match) => (
              <article className="match-card" key={match.number}>
                <div className="match-number">
                  <span>Match {match.number}</span>
                  <small>{match.isHome ? "Hemma" : "Borta"}</small>
                </div>
                <div className="match-content">
                  <div>
                    <span className="label">Tränare</span>
                    <p>
                      {match.coachIds.map((id) => coachName.get(id)).join(" + ")}
                    </p>
                  </div>
                  <div>
                    <span className="label">Spelare</span>
                    <p>
                      {match.playerIds.map((id) => playerName.get(id)).join(", ")}
                    </p>
                    <button
                      type="button"
                      className="copy-laget"
                      onClick={() => copyMatchForLagetSe(match.playerIds)}
                    >
                      Kopiera till Laget.se
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <section className="card fairness">
            <h2>Fördelning</h2>
            <div className="fairness-grid">
              {[...players]
                .sort(
                  (a, b) =>
                    result.appearances[b.id] - result.appearances[a.id] ||
                    a.name.localeCompare(b.name, "sv"),
                )
                .map((player) => (
                  <div key={player.id}>
                    <span>
                      {player.name}
                      {coachChildren.has(player.id) && (
                        <small> tränarbarn</small>
                      )}
                    </span>
                    <strong>
                      {result.appearances[player.id]}
                      <small className="home-count">
                        {" "}· {result.homeAppearances[player.id]} hemma
                      </small>
                    </strong>
                  </div>
                ))}
            </div>
          </section>
          <section className="card fairness">
            <h2>Tränarfördelning</h2>
            <div className="fairness-grid">
              {[...coaches]
                .sort(
                  (a, b) =>
                    result.coachAppearances[b.id] - result.coachAppearances[a.id] ||
                    a.name.localeCompare(b.name, "sv"),
                )
                .map((coach) => (
                  <div key={coach.id}>
                    <span>{coach.name}</span>
                    <strong>
                      {result.coachAppearances[coach.id]}
                      <small className="home-count">
                        {" "}· {result.coachHomeAppearances[coach.id]} hemma
                      </small>
                    </strong>
                  </div>
                ))}
            </div>
          </section>
          <section className="card fairness child-matches">
            <h2>Matcher per barn</h2>
            <div className="child-match-list">
              {[...players]
                .sort((a, b) => a.name.localeCompare(b.name, "sv"))
                .map((player) => {
                  const matches = result.matches
                    .filter((match) => match.playerIds.includes(player.id))
                    .map((match) => match.number);

                  return (
                    <div key={player.id}>
                      <span>{player.name}</span>
                      <strong>Ska spela match nr: {matches.join(", ")}</strong>
                    </div>
                  );
                })}
            </div>
          </section>
        </section>
      )}
    </main>
  );
}

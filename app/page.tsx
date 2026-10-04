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

type SavedState = {
  players: Player[];
  coaches: Coach[];
  matchCount: number;
  homePattern: boolean[];
  playersPerMatch: number;
  result: ScheduleResult | null;
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
        <div className="eyebrow">Innebandy · rotationsschema</div>
        <h1>Roterande schema</h1>
        <p>
          Skapa ett så jämnt säsongsschema som möjligt. Två tränare följer med
          varje match och deras barn får automatiskt en plats.
        </p>
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
          {homePattern.map((isHome, index) => (
            <label className="venue-row" key={index}>
              <span>Match {index + 1}</span>
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
          ))}
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
        </section>
      )}
    </main>
  );
}

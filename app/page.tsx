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
        setPlayersPerMatch(saved.playersPerMatch);
        setResult(saved.result);
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
      playersPerMatch,
      result,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [players, coaches, matchCount, playersPerMatch, result, loaded]);

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

  function updateCoach(id: string, patch: Partial<Coach>) {
    setCoaches((current) =>
      current.map((coach) => (coach.id === id ? { ...coach, ...patch } : coach)),
    );
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
        <h1>Alla ska få spela.</h1>
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
              setMatchCount(Number(event.target.value));
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
              <label className="name-row" key={player.id}>
                <span>{index + 1}</span>
                <input
                  value={player.name}
                  placeholder={`Spelare ${index + 1}`}
                  onChange={(event) => updatePlayer(player.id, event.target.value)}
                />
              </label>
            ))}
          </div>
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
                <strong>Tränare {index + 1}</strong>
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
                <div className="match-number">Match {match.number}</div>
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
                    <strong>{result.appearances[player.id]}</strong>
                  </div>
                ))}
            </div>
          </section>
        </section>
      )}
    </main>
  );
}

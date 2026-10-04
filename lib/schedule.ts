export type Player = {
  id: string;
  name: string;
};

export type Coach = {
  id: string;
  name: string;
  childId: string;
};

export type ScheduledMatch = {
  number: number;
  coachIds: string[];
  playerIds: string[];
};

export type ScheduleResult = {
  matches: ScheduledMatch[];
  appearances: Record<string, number>;
  score: number;
  maxPlayStreak: number;
  maxRestStreak: number;
  minAppearances: number;
  maxAppearances: number;
};

type Input = {
  players: Player[];
  coaches: Coach[];
  matchCount: number;
  playersPerMatch: number;
  attempts?: number;
};

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function longestRun(values: boolean[], target: boolean): number {
  let best = 0;
  let current = 0;
  for (const value of values) {
    current = value === target ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
}

function scoreSchedule(
  matches: ScheduledMatch[],
  players: Player[],
): Omit<ScheduleResult, "matches"> {
  const appearances: Record<string, number> = Object.fromEntries(
    players.map((player) => [player.id, 0]),
  );

  for (const match of matches) {
    for (const playerId of match.playerIds) appearances[playerId] += 1;
  }

  const counts = players.map((player) => appearances[player.id]);
  const average = counts.reduce((sum, value) => sum + value, 0) / players.length;

  let fairnessPenalty = 0;
  let streakPenalty = 0;
  let maxPlayStreak = 0;
  let maxRestStreak = 0;

  for (const player of players) {
    const pattern = matches.map((match) => match.playerIds.includes(player.id));
    const playRun = longestRun(pattern, true);
    const restRun = longestRun(pattern, false);
    maxPlayStreak = Math.max(maxPlayStreak, playRun);
    maxRestStreak = Math.max(maxRestStreak, restRun);

    fairnessPenalty += Math.pow(appearances[player.id] - average, 2) * 1000;
    streakPenalty += Math.pow(Math.max(0, playRun - 2), 2) * 90;
    streakPenalty += Math.pow(Math.max(0, restRun - 2), 2) * 70;

    for (let i = 1; i < pattern.length; i += 1) {
      if (pattern[i] === pattern[i - 1]) streakPenalty += 7;
    }
  }

  return {
    appearances,
    score: fairnessPenalty + streakPenalty,
    maxPlayStreak,
    maxRestStreak,
    minAppearances: Math.min(...counts),
    maxAppearances: Math.max(...counts),
  };
}

function buildCoachSchedule(coaches: Coach[], matchCount: number): string[][] {
  const totalSlots = matchCount * 2;
  const base = Math.floor(totalSlots / coaches.length);
  const extras = totalSlots % coaches.length;

  const targetEntries = shuffled(coaches).flatMap((coach, index) =>
    Array.from({ length: base + (index < extras ? 1 : 0) }, () => coach.id),
  );

  let best: string[][] | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const pool = shuffled(targetEntries);
    const schedule: string[][] = [];
    let valid = true;

    for (let match = 0; match < matchCount; match += 1) {
      const first = pool.pop();
      if (!first) {
        valid = false;
        break;
      }

      const secondIndex = pool.findIndex((id) => id !== first);
      if (secondIndex < 0) {
        valid = false;
        break;
      }

      const [second] = pool.splice(secondIndex, 1);
      schedule.push([first, second]);
    }

    if (!valid) continue;

    let score = 0;
    for (const coach of coaches) {
      const pattern = schedule.map((ids) => ids.includes(coach.id));
      score += Math.pow(Math.max(0, longestRun(pattern, true) - 2), 2) * 20;
      score += Math.pow(Math.max(0, longestRun(pattern, false) - 2), 2) * 10;
    }

    if (score < bestScore) {
      best = schedule;
      bestScore = score;
    }
  }

  if (!best) throw new Error("Kunde inte skapa ett giltigt tränarschema.");
  return best;
}

function buildCandidate(input: Input): ScheduledMatch[] {
  const { players, coaches, matchCount, playersPerMatch } = input;
  const coachSchedule = buildCoachSchedule(coaches, matchCount);
  const coachById = new Map(coaches.map((coach) => [coach.id, coach]));
  const appearances: Record<string, number> = Object.fromEntries(
    players.map((player) => [player.id, 0]),
  );
  const history: Record<string, boolean[]> = Object.fromEntries(
    players.map((player) => [player.id, []]),
  );

  const matches: ScheduledMatch[] = [];

  for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
    const coachIds = coachSchedule[matchIndex];
    const forcedChildren = [...new Set(
      coachIds.map((id) => coachById.get(id)?.childId).filter(Boolean) as string[],
    )];

    if (forcedChildren.length > playersPerMatch) {
      throw new Error("Fler obligatoriska tränarbarn än spelarplatser i en match.");
    }

    const selected = new Set(forcedChildren);

    while (selected.size < playersPerMatch) {
      const candidates = players
        .filter((player) => !selected.has(player.id))
        .map((player) => {
          const played = appearances[player.id];
          const previous = history[player.id];
          const recentPlay = [...previous].reverse().findIndex((value) => !value);
          const currentPlayStreak =
            recentPlay === -1 ? previous.length : recentPlay;
          const recentRest = [...previous].reverse().findIndex((value) => value);
          const currentRestStreak =
            recentRest === -1 ? previous.length : recentRest;

          const priority =
            played * 100 +
            currentPlayStreak * 25 -
            currentRestStreak * 18 +
            Math.random() * 12;

          return { id: player.id, priority };
        })
        .sort((a, b) => a.priority - b.priority);

      selected.add(candidates[0].id);
    }

    const playerIds = shuffled([...selected]);
    matches.push({ number: matchIndex + 1, coachIds, playerIds });

    for (const player of players) {
      const didPlay = selected.has(player.id);
      history[player.id].push(didPlay);
      if (didPlay) appearances[player.id] += 1;
    }
  }

  return matches;
}

export function generateSchedule(input: Input): ScheduleResult {
  const { players, coaches, matchCount, playersPerMatch, attempts = 700 } = input;

  if (players.length < playersPerMatch) {
    throw new Error("Antalet spelare per match kan inte vara större än laget.");
  }
  if (coaches.length < 2) {
    throw new Error("Minst två tränare krävs.");
  }
  if (coaches.some((coach) => !players.some((player) => player.id === coach.childId))) {
    throw new Error("Alla tränare måste vara kopplade till ett barn i laget.");
  }
  if (new Set(coaches.map((coach) => coach.childId)).size !== coaches.length) {
    throw new Error("Varje tränare måste vara kopplad till ett eget barn.");
  }

  let best: ScheduleResult | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const matches = buildCandidate(input);
    const scored = scoreSchedule(matches, players);
    const result = { matches, ...scored };

    if (!best || result.score < best.score) best = result;
    if (best.score === 0) break;
  }

  if (!best) throw new Error("Kunde inte generera ett schema.");
  return best;
}

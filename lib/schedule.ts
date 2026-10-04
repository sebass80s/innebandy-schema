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
  isHome: boolean;
  coachIds: string[];
  playerIds: string[];
};

export type ScheduleResult = {
  matches: ScheduledMatch[];
  appearances: Record<string, number>;
  homeAppearances: Record<string, number>;
  coachAppearances: Record<string, number>;
  coachHomeAppearances: Record<string, number>;
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
  homePattern: boolean[];
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
  coaches: Coach[],
): Omit<ScheduleResult, "matches"> {
  const appearances: Record<string, number> = Object.fromEntries(
    players.map((player) => [player.id, 0]),
  );
  const homeAppearances: Record<string, number> = Object.fromEntries(
    players.map((player) => [player.id, 0]),
  );
  const coachAppearances: Record<string, number> = Object.fromEntries(
    coaches.map((coach) => [coach.id, 0]),
  );
  const coachHomeAppearances: Record<string, number> = Object.fromEntries(
    coaches.map((coach) => [coach.id, 0]),
  );

  for (const match of matches) {
    for (const playerId of match.playerIds) {
      appearances[playerId] += 1;
      if (match.isHome) homeAppearances[playerId] += 1;
    }
    for (const coachId of match.coachIds) {
      coachAppearances[coachId] += 1;
      if (match.isHome) coachHomeAppearances[coachId] += 1;
    }
  }

  const counts = players.map((player) => appearances[player.id]);
  const average = counts.reduce((sum, value) => sum + value, 0) / players.length;
  const homeCounts = players.map((player) => homeAppearances[player.id]);
  const homeAverage =
    homeCounts.reduce((sum, value) => sum + value, 0) / players.length;
  const coachHomeCounts = coaches.map((coach) => coachHomeAppearances[coach.id]);
  const coachHomeAverage =
    coachHomeCounts.reduce((sum, value) => sum + value, 0) / coaches.length;

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
    fairnessPenalty +=
      Math.pow(homeAppearances[player.id] - homeAverage, 2) * 900;
    streakPenalty += Math.pow(Math.max(0, playRun - 2), 2) * 5000;
    streakPenalty += Math.pow(Math.max(0, restRun - 2), 2) * 5000;

    for (let i = 1; i < pattern.length; i += 1) {
      if (pattern[i] === pattern[i - 1]) streakPenalty += 7;
    }
  }

  for (const coach of coaches) {
    fairnessPenalty +=
      Math.pow(coachHomeAppearances[coach.id] - coachHomeAverage, 2) * 220;
  }

  return {
    appearances,
    homeAppearances,
    coachAppearances,
    coachHomeAppearances,
    score: fairnessPenalty + streakPenalty,
    maxPlayStreak,
    maxRestStreak,
    minAppearances: Math.min(...counts),
    maxAppearances: Math.max(...counts),
  };
}

function buildCoachSchedule(
  coaches: Coach[],
  matchCount: number,
  homePattern: boolean[],
): string[][] {
  const coachIds = coaches.map((coach) => coach.id);
  const totalSlots = matchCount * 2;
  const homeSlots = homePattern.filter(Boolean).length * 2;

  const minTotal = Math.floor(totalSlots / coaches.length);
  const maxTotal = Math.ceil(totalSlots / coaches.length);
  const minHome = Math.floor(homeSlots / coaches.length);
  const maxHome = Math.ceil(homeSlots / coaches.length);

  const possiblePairs = (coaches.length * (coaches.length - 1)) / 2;
  const desiredUniquePairs = Math.min(possiblePairs, matchCount);
  const requiredUniquePairs = Math.min(desiredUniquePairs, matchCount - 1);

  const pairs: [string, string][] = [];
  for (let first = 0; first < coachIds.length; first += 1) {
    for (let second = first + 1; second < coachIds.length; second += 1) {
      pairs.push([coachIds[first], coachIds[second]]);
    }
  }

  const totals = new Map(coachIds.map((id) => [id, 0]));
  const homes = new Map(coachIds.map((id) => [id, 0]));
  const pairCounts = new Map<string, number>();
  const schedule: string[][] = [];

  const pairKey = (a: string, b: string) => [a, b].sort().join("::");

  const hasTwoStraight = (coachId: string) => {
    if (schedule.length < 2) return false;
    return (
      schedule[schedule.length - 1].includes(coachId) &&
      schedule[schedule.length - 2].includes(coachId)
    );
  };

  const remainingCapacityIsFeasible = (nextMatchIndex: number) => {
    const remainingMatches = matchCount - nextMatchIndex;
    const remainingSlots = remainingMatches * 2;
    const remainingHomeSlots =
      homePattern.slice(nextMatchIndex).filter(Boolean).length * 2;

    let totalDeficit = 0;
    let homeDeficit = 0;

    for (const id of coachIds) {
      totalDeficit += Math.max(0, minTotal - (totals.get(id) ?? 0));
      homeDeficit += Math.max(0, minHome - (homes.get(id) ?? 0));
    }

    if (totalDeficit > remainingSlots) return false;
    if (homeDeficit > remainingHomeSlots) return false;

    const uniquePairs = pairCounts.size;
    if (uniquePairs + remainingMatches < requiredUniquePairs) return false;

    return true;
  };

  const search = (matchIndex: number): boolean => {
    if (matchIndex === matchCount) {
      const totalValues = [...totals.values()];
      const homeValues = [...homes.values()];

      if (Math.max(...totalValues) - Math.min(...totalValues) > 1) return false;
      if (Math.max(...homeValues) - Math.min(...homeValues) > 1) return false;
      if (pairCounts.size < requiredUniquePairs) return false;

      if (coaches.length === 4 && matchCount === 9) {
        if (pairCounts.size !== 6) return false;
        if ([...pairCounts.values()].some((count) => count > 2)) return false;
      }

      return true;
    }

    const isHome = homePattern[matchIndex];

    const candidates = shuffled(pairs)
      .filter(([first, second]) => {
        if ((totals.get(first) ?? 0) >= maxTotal) return false;
        if ((totals.get(second) ?? 0) >= maxTotal) return false;

        if (isHome) {
          if ((homes.get(first) ?? 0) >= maxHome) return false;
          if ((homes.get(second) ?? 0) >= maxHome) return false;
        }

        if (coaches.length === 4 && matchCount === 9) {
          if (hasTwoStraight(first) || hasTwoStraight(second)) return false;
        }

        const key = pairKey(first, second);
        if (
          coaches.length === 4 &&
          matchCount === 9 &&
          (pairCounts.get(key) ?? 0) >= 2
        ) {
          return false;
        }

        return true;
      })
      .sort(([a1, b1], [a2, b2]) => {
        const key1 = pairKey(a1, b1);
        const key2 = pairKey(a2, b2);
        const repeat1 = pairCounts.get(key1) ?? 0;
        const repeat2 = pairCounts.get(key2) ?? 0;
        if (repeat1 !== repeat2) return repeat1 - repeat2;

        const totalLoad1 = (totals.get(a1) ?? 0) + (totals.get(b1) ?? 0);
        const totalLoad2 = (totals.get(a2) ?? 0) + (totals.get(b2) ?? 0);
        if (totalLoad1 !== totalLoad2) return totalLoad1 - totalLoad2;

        if (isHome) {
          const homeLoad1 = (homes.get(a1) ?? 0) + (homes.get(b1) ?? 0);
          const homeLoad2 = (homes.get(a2) ?? 0) + (homes.get(b2) ?? 0);
          if (homeLoad1 !== homeLoad2) return homeLoad1 - homeLoad2;
        }

        return 0;
      });

    for (const [first, second] of candidates) {
      const key = pairKey(first, second);

      schedule.push([first, second]);
      totals.set(first, (totals.get(first) ?? 0) + 1);
      totals.set(second, (totals.get(second) ?? 0) + 1);
      if (isHome) {
        homes.set(first, (homes.get(first) ?? 0) + 1);
        homes.set(second, (homes.get(second) ?? 0) + 1);
      }
      pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);

      if (
        remainingCapacityIsFeasible(matchIndex + 1) &&
        search(matchIndex + 1)
      ) {
        return true;
      }

      schedule.pop();
      totals.set(first, (totals.get(first) ?? 0) - 1);
      totals.set(second, (totals.get(second) ?? 0) - 1);
      if (isHome) {
        homes.set(first, (homes.get(first) ?? 0) - 1);
        homes.set(second, (homes.get(second) ?? 0) - 1);
      }

      const nextPairCount = (pairCounts.get(key) ?? 1) - 1;
      if (nextPairCount === 0) pairCounts.delete(key);
      else pairCounts.set(key, nextPairCount);
    }

    return false;
  };

  if (!search(0)) {
    throw new Error("Kunde inte skapa ett giltigt tränarschema.");
  }

  return schedule;
}

function buildCandidate(input: Input): ScheduledMatch[] {
  const { players, coaches, matchCount, homePattern, playersPerMatch } = input;
  const coachSchedule = buildCoachSchedule(coaches, matchCount, homePattern);
  const coachById = new Map(coaches.map((coach) => [coach.id, coach]));
  const appearances: Record<string, number> = Object.fromEntries(
    players.map((player) => [player.id, 0]),
  );
  const history: Record<string, boolean[]> = Object.fromEntries(
    players.map((player) => [player.id, []]),
  );
  const homeAppearances: Record<string, number> = Object.fromEntries(
    players.map((player) => [player.id, 0]),
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

          const homeNeed = homePattern[matchIndex]
            ? homeAppearances[player.id] * 85
            : 0;

          const streakPriority =
            (currentPlayStreak >= 2 ? 100000 : 0) -
            (currentRestStreak >= 2 ? 100000 : 0);

          const priority =
            streakPriority +
            played * 100 +
            homeNeed +
            currentPlayStreak * 25 -
            currentRestStreak * 18 +
            Math.random() * 12;

          return { id: player.id, priority };
        })
        .sort((a, b) => a.priority - b.priority);

      selected.add(candidates[0].id);
    }

    const playerIds = shuffled([...selected]);
    matches.push({
      number: matchIndex + 1,
      isHome: homePattern[matchIndex],
      coachIds,
      playerIds,
    });

    for (const player of players) {
      const didPlay = selected.has(player.id);
      history[player.id].push(didPlay);
      if (didPlay) {
        appearances[player.id] += 1;
        if (homePattern[matchIndex]) homeAppearances[player.id] += 1;
      }
    }
  }

  return matches;
}

export function generateSchedule(input: Input): ScheduleResult {
  const {
    players,
    coaches,
    matchCount,
    homePattern,
    playersPerMatch,
    attempts = 700,
  } = input;

  if (homePattern.length !== matchCount) {
    throw new Error("Hemma/borta-listan måste innehålla exakt en markering per match.");
  }
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
    const scored = scoreSchedule(matches, players, coaches);

    const coachChildIds = new Set(coaches.map((coach) => coach.childId));
    const homeCountsForFairness =
      coaches.length === 2
        ? players
            .filter((player) => !coachChildIds.has(player.id))
            .map((player) => scored.homeAppearances[player.id])
        : players.map((player) => scored.homeAppearances[player.id]);

    if (
      homeCountsForFairness.length > 0 &&
      Math.max(...homeCountsForFairness) - Math.min(...homeCountsForFairness) > 2
    ) {
      continue;
    }

    const result = { matches, ...scored };

    if (!best || result.score < best.score) best = result;
    if (best.score === 0) break;
  }

  if (!best) throw new Error("Kunde inte generera ett schema.");
  return best;
}

import { generateSchedule, type Coach, type Player } from "../lib/schedule";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
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

type Scenario = {
  name: string;
  playerCount: number;
  coachCount: number;
  matchCount: number;
  homePattern: boolean[];
  playersPerMatch: number;
  runs: number;
};

const scenarios: Scenario[] = [
  { name: "standard", playerCount: 18, coachCount: 4, matchCount: 9, homePattern: [true, false, true, false, true, false, true, false, false], playersPerMatch: 8, runs: 60 },
  { name: "12p-3c", playerCount: 12, coachCount: 3, matchCount: 6, homePattern: [true, false, false, true, false, true], playersPerMatch: 7, runs: 25 },
  { name: "14p-4c", playerCount: 14, coachCount: 4, matchCount: 8, homePattern: [false, true, false, true, true, false, true, false], playersPerMatch: 8, runs: 25 },
  { name: "16p-5c", playerCount: 16, coachCount: 5, matchCount: 10, homePattern: [true, true, false, false, true, false, true, false, true, false], playersPerMatch: 9, runs: 25 },
  { name: "18p-5c", playerCount: 18, coachCount: 5, matchCount: 9, homePattern: [false, true, false, true, false, false, true, false, true], playersPerMatch: 9, runs: 25 },
  { name: "20p-4c", playerCount: 20, coachCount: 4, matchCount: 10, homePattern: [true, false, true, false, true, false, false, true, false, true], playersPerMatch: 10, runs: 25 },
  { name: "20p-6c", playerCount: 20, coachCount: 6, matchCount: 12, homePattern: [true, false, false, true, true, false, true, false, false, true, false, true], playersPerMatch: 10, runs: 25 },
  { name: "22p-5c", playerCount: 22, coachCount: 5, matchCount: 11, homePattern: [false, true, false, true, false, true, false, true, false, true, false], playersPerMatch: 10, runs: 25 },
  { name: "24p-6c", playerCount: 24, coachCount: 6, matchCount: 12, homePattern: [true, true, false, false, true, false, true, false, true, false, false, true], playersPerMatch: 12, runs: 25 },
];

let totalRuns = 0;

for (const scenario of scenarios) {
  const players: Player[] = Array.from({ length: scenario.playerCount }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Spelare ${i + 1}`,
  }));

  const coaches: Coach[] = Array.from({ length: scenario.coachCount }, (_, i) => ({
    id: `c${i + 1}`,
    name: `Tränare ${i + 1}`,
    childId: `p${i + 1}`,
  }));

  for (let run = 1; run <= scenario.runs; run += 1) {
    totalRuns += 1;

    const result = generateSchedule({
      players,
      coaches,
      matchCount: scenario.matchCount,
      homePattern: scenario.homePattern,
      playersPerMatch: scenario.playersPerMatch,
      attempts: scenario.name === "standard" ? 250 : 140,
    });

    assert(
      result.matches.length === scenario.matchCount,
      `${scenario.name} run ${run}: fel antal matcher`,
    );

    const expectedSlots = scenario.matchCount * scenario.playersPerMatch;
    assert(
      result.matches.every(
        (match, index) => match.isHome === scenario.homePattern[index],
      ),
      `${scenario.name} run ${run}: hemma/borta-ordningen ändrades`,
    );
    const totalSlots = result.matches.reduce(
      (sum, match) => sum + match.playerIds.length,
      0,
    );
    assert(
      totalSlots === expectedSlots,
      `${scenario.name} run ${run}: fel antal spelarplatser`,
    );

    for (const match of result.matches) {
      assert(
        match.coachIds.length === 2,
        `${scenario.name} run ${run}: inte två tränare`,
      );
      assert(
        new Set(match.coachIds).size === 2,
        `${scenario.name} run ${run}: samma tränare två gånger`,
      );
      assert(
        match.playerIds.length === scenario.playersPerMatch,
        `${scenario.name} run ${run}: fel antal spelare i match`,
      );
      assert(
        new Set(match.playerIds).size === scenario.playersPerMatch,
        `${scenario.name} run ${run}: dublettspelare`,
      );

      for (const coachId of match.coachIds) {
        const coach = coaches.find((item) => item.id === coachId);
        assert(coach, `${scenario.name} run ${run}: okänd tränare`);
        assert(
          match.playerIds.includes(coach.childId),
          `${scenario.name} run ${run}: tränarbarn saknas`,
        );
      }
    }

    const counts = players.map((player) => result.appearances[player.id]);
    const homeCounts = players.map((player) => result.homeAppearances[player.id]);
    const average = expectedSlots / scenario.playerCount;
    const spread = Math.max(...counts) - Math.min(...counts);

    // The generator should stay very close to the mathematical average.
    assert(
      spread <= 2,
      `${scenario.name} run ${run}: för stor skillnad mellan flest/minst matcher (${spread})`,
    );
    assert(
      Math.max(...homeCounts) - Math.min(...homeCounts) <= 2,
      `${scenario.name} run ${run}: för ojämn fördelning av hemmamatcher`,
    );

    for (const player of players) {
      const pattern = result.matches.map((match) => match.playerIds.includes(player.id));
      const playRun = longestRun(pattern, true);
      const restRun = longestRun(pattern, false);

      // Generic scenarios can occasionally require a 3-run, but longer streaks are unacceptable.
      assert(
        playRun <= 3,
        `${scenario.name} run ${run}: för lång spelsvit för ${player.id} (${playRun})`,
      );
      assert(
        restRun <= 3,
        `${scenario.name} run ${run}: för lång vilosvit för ${player.id} (${restRun})`,
      );
    }

    const coachAppearances = new Map<string, number>(
      coaches.map((coach) => [coach.id, 0]),
    );
    const pairCounts = new Map<string, number>();

    for (const match of result.matches) {
      for (const coachId of match.coachIds) {
        coachAppearances.set(coachId, (coachAppearances.get(coachId) ?? 0) + 1);
      }
      const pairKey = [...match.coachIds].sort().join("::");
      pairCounts.set(pairKey, (pairCounts.get(pairKey) ?? 0) + 1);
    }

    const coachCounts = [...coachAppearances.values()];
    const coachHomeCounts = coaches.map(
      (coach) => result.coachHomeAppearances[coach.id],
    );
    assert(
      Math.max(...coachCounts) - Math.min(...coachCounts) <= 1,
      `${scenario.name} run ${run}: tränarmatcherna är inte jämnt fördelade`,
    );
    assert(
      Math.max(...coachHomeCounts) - Math.min(...coachHomeCounts) <= 1,
      `${scenario.name} run ${run}: tränarnas hemmamatcher är inte jämnt fördelade`,
    );

    const possiblePairs = (scenario.coachCount * (scenario.coachCount - 1)) / 2;
    const desiredUniquePairs = Math.min(possiblePairs, scenario.matchCount);
    assert(
      pairCounts.size >= Math.min(desiredUniquePairs, scenario.matchCount - 1),
      `${scenario.name} run ${run}: för dålig variation på tränarpar`,
    );

    if (scenario.name === "standard") {
      assert(
        Math.min(...counts) >= 3 && Math.max(...counts) <= 5,
        `standard run ${run}: fördelning utanför 3-5`,
      );
      assert(result.maxPlayStreak <= 2, `standard run ${run}: för lång spelsvit`);
      assert(result.maxRestStreak <= 2, `standard run ${run}: för lång vilosvit`);
      assert(pairCounts.size === 6, `standard run ${run}: alla sex tränarpar användes inte`);
      assert(
        Math.max(...pairCounts.values()) <= 2,
        `standard run ${run}: samma tränarpar användes fler än två gånger`,
      );
    }

    assert(Number.isFinite(average), `${scenario.name}: ogiltigt snitt`);
  }

  console.log(`${scenario.name}: PASS (${scenario.runs} runs)`);
}

console.log(`${totalRuns} simulations PASS across ${scenarios.length} scenarios`);

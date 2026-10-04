import { generateSchedule, type Coach, type Player } from "../lib/schedule";

const players: Player[] = Array.from({ length: 18 }, (_, i) => ({
  id: `p${i + 1}`,
  name: `Spelare ${i + 1}`,
}));

const coaches: Coach[] = Array.from({ length: 4 }, (_, i) => ({
  id: `c${i + 1}`,
  name: `Tränare ${i + 1}`,
  childId: `p${i + 1}`,
}));

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

for (let run = 1; run <= 60; run += 1) {
  const result = generateSchedule({
    players,
    coaches,
    matchCount: 9,
    playersPerMatch: 8,
    attempts: 250,
  });

  assert(result.matches.length === 9, `Run ${run}: fel antal matcher`);

  const totalSlots = result.matches.reduce(
    (sum, match) => sum + match.playerIds.length,
    0,
  );
  assert(totalSlots === 72, `Run ${run}: fel antal spelarplatser`);

  for (const match of result.matches) {
    assert(match.coachIds.length === 2, `Run ${run}: inte två tränare`);
    assert(new Set(match.coachIds).size === 2, `Run ${run}: samma tränare två gånger`);
    assert(match.playerIds.length === 8, `Run ${run}: inte åtta spelare`);
    assert(new Set(match.playerIds).size === 8, `Run ${run}: dublettspelare`);

    for (const coachId of match.coachIds) {
      const coach = coaches.find((item) => item.id === coachId);
      assert(coach, `Run ${run}: okänd tränare`);
      assert(
        match.playerIds.includes(coach.childId),
        `Run ${run}: tränarbarn saknas`,
      );
    }
  }

  const counts = players.map((player) => result.appearances[player.id]);
  assert(Math.min(...counts) >= 3, `Run ${run}: någon fick färre än tre matcher`);
  assert(Math.max(...counts) <= 5, `Run ${run}: någon fick fler än fem matcher`);
  assert(result.maxPlayStreak <= 2, `Run ${run}: för lång spelsvit`);
  assert(result.maxRestStreak <= 2, `Run ${run}: för lång vilosvit`);

  const pairCounts = new Map<string, number>();
  for (const match of result.matches) {
    const key = [...match.coachIds].sort().join("::");
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }

  assert(pairCounts.size === 6, `Run ${run}: alla sex tränarpar användes inte`);
  assert(
    Math.max(...pairCounts.values()) <= 2,
    `Run ${run}: samma tränarpar användes fler än två gånger`,
  );
}

console.log("60 simulations PASS");

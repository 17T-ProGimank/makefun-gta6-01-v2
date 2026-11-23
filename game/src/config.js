// SOLMARA — round 4 configuration.
// Base tuning from the shared spec, plus the round-4 systems: respect
// progression, garage management (4 cars, repairs, paint, upgrades) and
// the crew payout bonus. Everything here is original Solmara content.
export const CONFIG = {
  city: { size: 420, block: 42, roadWidth: 12, blocks: 9 },
  colors: {
    skyTop: 0x35507a, skyHorizon: 0xff9a3c, sun: 0xffb347,
    road: 0x23272e, sidewalk: 0x9aa0a8, ground: 0x3d5a3a,
    sea: 0x1d5f7a, sand: 0xd9c08a,
    buildingPalette: [0x8a6f5c, 0x6f7d8a, 0x9a8a6f, 0x7a6f8a, 0xb08a5c, 0x5c7a8a],
    windowLit: 0xffd27a, windowDark: 0x2a3542
  },
  player: { walkSpeed: 6, runSpeed: 10, health: 100 },
  car: { accel: 20, brake: 32, maxSpeed: 40, reverseMax: 12, turn: 2.4 },
  traffic: { count: 18 },
  peds: { count: 28 },
  police: { maxCars: 6, heliSpeed: 24, roadblockAtStars: 3 },
  money: { start: 500 },
  camera: { dist: 10, height: 5, lookHeight: 1.6 },
  // Round 4: respect — mission reward divided by this gives respect points.
  respect: { missionDiv: 10 },
  // Round 4: garage — keep upgradeCosts in lockstep with the GARAGE.upgrades
  // table in garage.js ([800, 1800, 3500] = levels 1/2/3). repairCost and
  // paintCost are the same numbers garage.js charges.
  garage: { maxCars: 4, repairCost: 150, paintCost: 200, upgradeCosts: [800, 1800, 3500] },
  // Round 4: crew — Mara's +10% mission payout bonus.
  crew: { payoutBonus: 0.1 }
};

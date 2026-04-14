import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const sql = neon(url);

try {
  // Seed achievements — requirement is a JSON column
  const existing = await sql`SELECT COUNT(*) as cnt FROM achievements`;
  if (Number(existing[0].cnt) === 0) {
    const achievements = [
      { key: "first_shift",   name: "First Shift",       description: "Complete your first gig shift",              category: "gig",     rarity: "common",    pointsReward: 50,   icon: "Car",    requirement: { type: "shift_count", value: 1 } },
      { key: "shift_veteran", name: "Shift Veteran",     description: "Complete 10 gig shifts",                     category: "gig",     rarity: "uncommon",  pointsReward: 150,  icon: "Trophy", requirement: { type: "shift_count", value: 10 } },
      { key: "road_warrior",  name: "Road Warrior",      description: "Log 100 miles in a single month",            category: "gig",     rarity: "rare",      pointsReward: 300,  icon: "MapPin", requirement: { type: "monthly_miles", value: 100 } },
      { key: "first_mile",    name: "First Mile",        description: "Log your first mileage entry",               category: "gig",     rarity: "common",    pointsReward: 25,   icon: "MapPin", requirement: { type: "mileage_count", value: 1 } },
      { key: "tax_saver",     name: "Tax Saver",         description: "Save $100+ in tax deductions",               category: "finance", rarity: "uncommon",  pointsReward: 200,  icon: "DollarSign", requirement: { type: "tax_deduction", value: 100 } },
      { key: "rule_maker",    name: "Rule Maker",        description: "Create your first financial rule",           category: "finance", rarity: "common",    pointsReward: 30,   icon: "Settings", requirement: { type: "rule_count", value: 1 } },
      { key: "early_bird",    name: "Early Bird",        description: "Complete a shift starting before 7am",       category: "gig",     rarity: "uncommon",  pointsReward: 100,  icon: "Sunrise", requirement: { type: "early_shift", value: 7 } },
      { key: "night_owl",     name: "Night Owl",         description: "Complete a shift starting after 10pm",       category: "gig",     rarity: "uncommon",  pointsReward: 100,  icon: "Moon",   requirement: { type: "night_shift", value: 22 } },
      { key: "century_club",  name: "Century Club",      description: "Earn $100 in a single shift",                category: "gig",     rarity: "rare",      pointsReward: 250,  icon: "TrendingUp", requirement: { type: "shift_earnings", value: 100 } },
      { key: "streak_7",      name: "Week Warrior",      description: "Maintain a 7-day activity streak",           category: "gig",     rarity: "rare",      pointsReward: 200,  icon: "Flame",  requirement: { type: "streak_days", value: 7 } },
      { key: "streak_30",     name: "Monthly Legend",    description: "Maintain a 30-day activity streak",          category: "gig",     rarity: "epic",      pointsReward: 500,  icon: "Zap",    requirement: { type: "streak_days", value: 30 } },
      { key: "top_earner",    name: "Top Earner",        description: "Reach the top 10 on the leaderboard",        category: "social",  rarity: "legendary", pointsReward: 1000, icon: "Crown",  requirement: { type: "leaderboard_rank", value: 10 } },
    ];

    for (const a of achievements) {
      await sql`
        INSERT INTO achievements ("key", name, description, category, rarity, "pointsReward", icon, requirement)
        VALUES (${a.key}, ${a.name}, ${a.description}, ${a.category}, ${a.rarity}, ${a.pointsReward}, ${a.icon}, ${JSON.stringify(a.requirement)})
      `;
    }
    console.log(`✓ Seeded ${achievements.length} achievements`);
  } else {
    console.log(`Achievements already seeded: ${existing[0].cnt}`);
  }

  // Seed a sample challenge
  const existingChallenges = await sql`SELECT COUNT(*) as cnt FROM challenges`;
  if (Number(existingChallenges[0].cnt) === 0) {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await sql`
      INSERT INTO challenges (name, description, type, category, goal, unit, "pointsReward", "startsAt", "endsAt", active)
      VALUES (${"Week Hustle"}, ${"Complete 5 gig shifts this week"}, ${"weekly"}, ${"gig"}, ${5}, ${"shifts"}, ${200}, ${now}, ${weekFromNow}, ${true})
    `;
    console.log("✓ Seeded 1 sample challenge");
  } else {
    console.log(`Challenges already seeded: ${existingChallenges[0].cnt}`);
  }

} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}

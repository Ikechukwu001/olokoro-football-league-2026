const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const fs = require("fs");
const path = require("path");

const serviceAccountPath = path.join(
  process.cwd(),
  "service-account.json"
);


if (!fs.existsSync(serviceAccountPath)) {
  throw new Error("service-account.json not found in project root.");
}

const serviceAccount = JSON.parse(
  fs.readFileSync(serviceAccountPath, "utf8")
);

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert(serviceAccount),
    });

const db = getFirestore(app);

const teams = [
  ["Amizi", "A"], ["Amuzu", "A"], ["Itu", "A"],
  ["Umuajata", "B"], ["Amangwo", "B"], ["Itaja", "B"],
  ["Amakama", "C"], ["Umuoparaozara", "C"], ["Umuntu", "C"],
  ["Agbama", "D"], ["Umudere", "D"], ["Umuobia", "D"],
];

const groupFixtures = [
  ["2026-11-15T15:00:00+01:00", "Amizi", "Amuzu", "A"],
  ["2026-11-21T16:00:00+01:00", "Umuajata", "Amangwo", "B"],
  ["2026-11-28T16:00:00+01:00", "Amakama", "Umuoparaozara", "C"],
  ["2026-11-29T16:00:00+01:00", "Agbama", "Umudere", "D"],
  ["2026-12-05T16:00:00+01:00", "Amuzu", "Itu", "A"],
  ["2026-12-06T16:00:00+01:00", "Amangwo", "Itaja", "B"],
  ["2026-12-09T16:00:00+01:00", "Umuoparaozara", "Umuntu", "C"],
  ["2026-12-12T16:00:00+01:00", "Umudere", "Umuobia", "D"],
  ["2026-12-13T16:00:00+01:00", "Itu", "Amizi", "A"],
  ["2026-12-14T16:00:00+01:00", "Itaja", "Umuajata", "B"],
  ["2026-12-15T16:00:00+01:00", "Umuntu", "Amakama", "C"],
  ["2026-12-16T16:00:00+01:00", "Umuobia", "Agbama", "D"],
];

const knockout = [
  ["2026-12-19T15:30:00+01:00", "1st Group A", "2nd Group C", "quarterfinal", 1],
  ["2026-12-20T15:30:00+01:00", "1st Group C", "2nd Group A", "quarterfinal", 2],
  ["2026-12-21T15:30:00+01:00", "1st Group B", "2nd Group D", "quarterfinal", 3],
  ["2026-12-22T15:30:00+01:00", "1st Group D", "2nd Group B", "quarterfinal", 4],
  ["2026-12-25T15:30:00+01:00", "Winner QF1", "Winner QF3", "semifinal", 1],
  ["2026-12-27T15:30:00+01:00", "Winner QF2", "Winner QF4", "semifinal", 2],
  ["2026-12-30T15:30:00+01:00", "Loser SF1", "Loser SF2", "third_place", 1],
  ["2026-12-31T15:00:00+01:00", "Winner SF1", "Winner SF2", "final", 1],
];

async function seed() {
  const batch = db.batch();
  teams.forEach(([name, group]) => {
    batch.set(db.collection("teams").doc(name.toLowerCase()), { name, group, createdAt: new Date().toISOString() });
  });

  groupFixtures.forEach(([date, homeTeam, awayTeam, group], index) => {
    const id = `group-${String(index + 1).padStart(2, "0")}`;
    batch.set(db.collection("matches").doc(id), {
      id, stage: "group", group, round: "Group Stage", matchNumber: index + 1,
      date, homeTeam, awayTeam, homeScore: 0, awayScore: 0,
      status: "scheduled", events: [],
    });
  });

  knockout.forEach(([date, homeTeam, awayTeam, stage, number], index) => {
    const id = `${stage}-${number}`;
    batch.set(db.collection("matches").doc(id), {
      id, stage, group: null, round: stage === "quarterfinal" ? "Quarter-finals" :
        stage === "semifinal" ? "Semi-finals" : stage === "third_place" ? "Third-place match" : "Final",
      matchNumber: 13 + index, date, homeTeam, awayTeam,
      homeScore: 0, awayScore: 0, status: "scheduled", events: [],
    });
  });

  await batch.commit();
  console.log("Seeded 12 teams and 20 fixtures.");
}
seed().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });

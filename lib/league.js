export const GROUPS = {
  A: ["Amizi", "Amuzu", "Itu"],
  B: ["Umuajata", "Amangwo", "Itaja"],
  C: ["Amakama", "Umuoparaozara", "Umuntu"],
  D: ["Agbama", "Umudere", "Umuobia"],
};

export function calculateStandings(matches) {
  const table = {};
  Object.entries(GROUPS).forEach(([group, teams]) => {
    teams.forEach((name) => {
      table[name] = {
        team: name, group, played: 0, won: 0, drawn: 0, lost: 0,
        gf: 0, ga: 0, gd: 0, points: 0,
      };
    });
  });

  matches.filter((m) => m.stage === "group" && m.status === "finished").forEach((m) => {
    const home = table[m.homeTeam];
    const away = table[m.awayTeam];
    if (!home || !away) return;

    const hs = Number(m.homeScore || 0);
    const as = Number(m.awayScore || 0);
    home.played++; away.played++;
    home.gf += hs; home.ga += as;
    away.gf += as; away.ga += hs;

    if (hs > as) {
      home.won++; home.points += 3; away.lost++;
    } else if (hs < as) {
      away.won++; away.points += 3; home.lost++;
    } else {
      home.drawn++; away.drawn++; home.points++; away.points++;
    }
  });

  return Object.values(table).map((t) => ({ ...t, gd: t.gf - t.ga }))
    .sort((a, b) => a.group.localeCompare(b.group) ||
      b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
}

export function calculateScorers(matches) {
  const totals = {};
  matches.forEach((match) => {
    (match.events || []).filter((event) => event.type === "goal").forEach((event) => {
      const name = (event.playerName || "").trim();
      if (!name) return;
      const key = `${name.toLowerCase()}__${event.teamName}`;
      if (!totals[key]) totals[key] = { player: name, team: event.teamName, goals: 0 };
      totals[key].goals += 1;
    });
  });
  return Object.values(totals).sort((a, b) => b.goals - a.goals || a.player.localeCompare(b.player));
}

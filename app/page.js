
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { calculateScorers, calculateStandings } from "../lib/league";
import {
  Activity,
  CalendarDays,
  ChevronRight,
  CircleDot,
  Clock3,
  Goal,
  Home,
  LockKeyhole,
  Radio,
  Shield,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

const groups = ["A", "B", "C", "D"];
const tabs = ["Matches", "Standings", "Top scorers", "Teams"];

function formatDate(value) {
  if (!value) return "Date TBC";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date TBC";

  return date.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function dateLabel(date) {
  if (!date) return "DATE TBC";

  const parsedDate = new Date(
    date.length === 10 ? `${date}T00:00:00` : date
  );

  if (Number.isNaN(parsedDate.getTime())) {
    return "DATE TBC";
  }

  return parsedDate.toLocaleDateString("en-GB", {
    timeZone: "Africa/Lagos",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).toUpperCase();
}



function MatchCard({ match }) {
  const live = match.status === "live";
  const halftime = match.status === "halftime";
  const finished = match.status === "finished";

  return (
    <Link
      href={`/matches/${match.id}`}
      className="block rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition hover:border-emerald-500/60 hover:bg-slate-800/80"
    >
      <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
        <span>
          {match.round}
          {match.group ? ` · Group ${match.group}` : ""}
        </span>

        
<div className="text-right">
  <p
    className={
      live
        ? "font-bold text-emerald-400"
        : finished
          ? "font-bold text-slate-200"
          : halftime
            ? "font-bold text-yellow-400"
            : "text-slate-400"
    }
  >
    {live
      ? "● LIVE"
      : halftime
        ? "HALF TIME"
        : finished
          ? "FULL TIME"
          : dateLabel(match.date)}
  </p>

  {finished && (
    <p className="mt-1 text-[10px] font-semibold text-emerald-400">
      {dateLabel(match.date)}
    </p>
  )}
</div>

      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <strong>{match.homeTeam}</strong>

        <div className="rounded-lg bg-slate-800 px-4 py-2 text-xl font-black tabular-nums">
          {live || halftime || finished
            ? `${match.homeScore ?? 0} - ${match.awayScore ?? 0}`
            : "VS"}
        </div>

        <strong className="text-right">{match.awayTeam}</strong>
      </div>

      {match.events?.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-slate-800 pt-2 text-xs text-slate-400">
          {match.events
            .slice()
            .reverse()
            .slice(0, 3)
            .map((event, i) => (
              <p key={`${event.createdAt || i}-${i}`}>
                {event.minute ? `${event.minute}' ` : ""}
                {event.type === "goal"
                  ? "⚽"
                  : event.type === "yellow"
                    ? "🟨"
                    : "🟥"}{" "}
                {event.playerName} · {event.teamName}
              </p>
            ))}
        </div>
      )}

      <p className="mt-3 border-t border-slate-800 pt-3 text-right text-xs font-bold text-emerald-400">
        View match details →
      </p>
    </Link>
  );
}

function SectionTitle({ children, action }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-base font-extrabold text-white">
        {children}
      </h2>
      {action}
    </div>
  );
}

export default function HomePage() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tab, setTab] = useState("Matches");
  const [groupFilter, setGroupFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubMatches = onSnapshot(
      collection(db, "matches"),
      (snap) => {
        const rows = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        rows.sort((a, b) => new Date(a.date) - new Date(b.date));
        setMatches(rows);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    const unsubTeams = onSnapshot(
      collection(db, "teams"),
      (snap) => {
        setTeams(
          snap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      }
    );

    return () => {
      unsubMatches();
      unsubTeams();
    };
  }, []);

  const standings = useMemo(
    () => calculateStandings(matches),
    [matches]
  );

  const scorers = useMemo(
    () => calculateScorers(matches),
    [matches]
  );

  const liveMatches = matches.filter((m) => m.status === "live");
  const upcoming = matches.filter((m) => m.status === "scheduled");
  const finished = matches.filter((m) => m.status === "finished");
  const halftimeMatches = matches.filter((m) => m.status === "halftime");

  const visibleMatches = useMemo(() => {
    const filtered = matches.filter((m) =>
      groupFilter === "All" || m.group === groupFilter
    );

    return filtered;
  }, [matches, groupFilter]);

  const totalGoals = scorers.reduce(
    (total, scorer) => total + scorer.goals,
    0
  );

  return (
    <main className="min-h-screen bg-[#0d1219] text-white">
      {/* TOP NAVIGATION */}
      <header className="sticky top-0 z-50 border-b border-[#252d38] bg-[#111720]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3 lg:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500 text-sm font-black text-[#07130e]">
              OFL
            </div>
            <div>
              <p className="text-sm font-black tracking-wide">
                OLOKORO <span className="text-emerald-400">LEAGUE</span>
              </p>
              <p className="text-[10px] font-semibold tracking-[.2em] text-slate-500">
                2026 SEASON
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {tabs.map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`text-sm font-semibold transition ${
                  tab === item
                    ? "text-emerald-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>

          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-lg border border-[#354150] px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-emerald-500 hover:text-white"
          >
            <LockKeyhole size={14} />
            Admin
          </Link>
        </div>
      </header>

      {/* COMPETITION BANNER */}
      <section className="border-b border-[#252d38] bg-gradient-to-r from-[#102b22] via-[#14251f] to-[#111720]">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-6 px-4 py-8 md:flex-row md:items-center lg:px-6">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-[.2em] text-emerald-400">
              <Trophy size={15} />
              THE VILLAGE. THE PRIDE. THE GAME.
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              Olokoro Football League
              <span className="ml-2 text-emerald-400">2026</span>
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Follow every goal, every match and every point.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 md:gap-3">
            {[
              ["12", "TEAMS"],
              ["4", "GROUPS"],
              ["20", "MATCHES"],
              ["1", "CHAMPION"],
            ].map(([number, label]) => (
              <div
                key={label}
                className="min-w-0 rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-center"
              >
                <p className="text-xl font-black md:text-2xl">{number}</p>
                <p className="mt-1 text-[9px] font-bold tracking-wider text-slate-500 md:text-[10px]">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE STATUS STRIP */}
      <div className="border-b border-[#252d38] bg-[#151c26]">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-2 text-xs font-bold text-red-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            LIVE CENTRE
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Activity size={14} className="text-emerald-400" />
            {liveMatches.length + halftimeMatches.length} Live matches
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CalendarDays size={14} />
            {upcoming.length} Upcoming
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Trophy size={14} />
            {finished.length} Completed
          </div>

          <div className="ml-auto hidden text-xs text-slate-500 sm:block">
            <span className="text-emerald-400">●</span> Live updates enabled
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-6 lg:grid-cols-[210px_minmax(0,1fr)_300px] lg:px-6">

        {/* LEFT SIDEBAR */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-5">
            <div className="rounded-xl border border-[#252d38] bg-[#151c26] p-3">
              <p className="mb-3 px-2 text-[10px] font-black tracking-[.18em] text-slate-500">
                COMPETITION
              </p>

              <button
                onClick={() => setTab("Matches")}
                className="flex w-full items-center gap-3 rounded-lg bg-emerald-500/10 px-3 py-3 text-left text-sm font-bold text-emerald-400"
              >
                <Home size={16} />
                Overview
              </button>

              {[
                ["Matches", CalendarDays],
                ["Standings", Trophy],
                ["Top scorers", Goal],
                ["Teams", Users],
              ].map(([label, Icon]) => (
                <button
                  key={label}
                  onClick={() => setTab(label)}
                  className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-slate-400 transition hover:bg-[#202a37] hover:text-white"
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-[#252d38] bg-[#151c26] p-3">
              <p className="mb-3 px-2 text-[10px] font-black tracking-[.18em] text-slate-500">
                GROUPS
              </p>

              {groups.map((group) => (
                <button
                  key={group}
                  onClick={() => {
                    setGroupFilter(group);
                    setTab("Matches");
                  }}
                  className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-3 text-sm transition ${
                    groupFilter === group
                      ? "bg-emerald-500/10 font-bold text-emerald-400"
                      : "text-slate-400 hover:bg-[#202a37] hover:text-white"
                  }`}
                >
                  Group {group}
                  <ChevronRight size={14} />
                </button>
              ))}

              <button
                onClick={() => setGroupFilter("All")}
                className="mt-2 w-full rounded-lg border border-[#303b49] px-3 py-2 text-xs font-bold text-slate-400 hover:text-white"
              >
                All groups
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <section className="min-w-0">
          {error && (
            <div className="mb-5 rounded-lg border border-red-900 bg-red-950/50 p-4 text-sm text-red-300">
              Firestore connection error: {error}
            </div>
          )}

          {/* MOBILE TABS */}
          <div className="mb-5 flex gap-2 overflow-x-auto pb-2 lg:hidden">
            {tabs.map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold ${
                  tab === item
                    ? "bg-emerald-500 text-[#07130e]"
                    : "bg-[#202a37] text-slate-400"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="rounded-xl border border-[#252d38] bg-[#151c26] p-12 text-center text-sm text-slate-400">
              Loading competition data...
            </div>
          ) : (
            <>
              {/* MATCHES */}
              {tab === "Matches" && (
                <div className="space-y-7">
                  <div className="flex items-center justify-between">
                    <SectionTitle>
                      <Radio size={18} className="text-emerald-400" />
                      Match centre
                    </SectionTitle>
                    <span className="text-xs text-slate-500">
                      {matches.length} matches
                    </span>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {["All", ...groups].map((group) => (
                      <button
                        key={group}
                        onClick={() => setGroupFilter(group)}
                        className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold ${
                          groupFilter === group
                            ? "bg-emerald-500 text-[#07130e]"
                            : "border border-[#303b49] bg-[#151c26] text-slate-400 hover:text-white"
                        }`}
                      >
                        {group === "All" ? "All matches" : `Group ${group}`}
                      </button>
                    ))}
                  </div>

                  {(groupFilter === "All" ? liveMatches : visibleMatches.filter(m => m.status === "live")).length > 0 && (
                    <div>
                      <SectionTitle>
                        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                        Live now
                      </SectionTitle>
                      <div className="space-y-3">
                        {(groupFilter === "All" ? liveMatches : visibleMatches.filter(m => m.status === "live")).map((match) => (
                          <MatchCard key={match.id} match={match} />
                        ))}
                      </div>
                    </div>
                  )}

                  {halftimeMatches.length > 0 && groupFilter === "All" && (
                    <div>
                      <SectionTitle>
                        <CircleDot size={17} className="text-amber-400" />
                        Half-time
                      </SectionTitle>
                      <div className="space-y-3">
                        {halftimeMatches.map((match) => (
                          <MatchCard key={match.id} match={match} />
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <SectionTitle>
                      <CalendarDays size={17} className="text-emerald-400" />
                      Upcoming fixtures
                    </SectionTitle>
                    <div className="space-y-3">
                      {(groupFilter === "All" ? upcoming : visibleMatches.filter(m => m.status === "scheduled")).length ? (
                        (groupFilter === "All" ? upcoming : visibleMatches.filter(m => m.status === "scheduled")).map((match) => (
                          <MatchCard key={match.id} match={match} />
                        ))
                      ) : (
                        <p className="rounded-xl border border-[#252d38] bg-[#151c26] p-5 text-sm text-slate-500">
                          No upcoming fixtures in this selection.
                        </p>
                      )}
                    </div>
                  </div>

                 
<div>
  <SectionTitle>
    <Trophy size={17} className="text-amber-400" />
    Finished Fixtures
  </SectionTitle>

  <div className="space-y-3">
    {finished
      .filter((match) =>
        groupFilter === "All" || match.group === groupFilter
      )
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .length > 0 ? (
        finished
          .filter((match) =>
            groupFilter === "All" || match.group === groupFilter
          )
          .slice()
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .map((match) => (
            <MatchCard key={match.id} match={match} />
          ))
      ) : (
        <p className="rounded-xl border border-[#252d38] bg-[#151c26] p-5 text-sm text-slate-500">
          No finished fixtures yet. Completed match results will appear here.
        </p>
      )}
  </div>
</div>

                </div>
              )}

              {/* STANDINGS */}
              {tab === "Standings" && (
                <div>
                  <SectionTitle>
                    <Trophy size={19} className="text-amber-400" />
                    Group standings
                  </SectionTitle>

                  {groups.map((group) => (
                    <div key={group} className="mb-5 overflow-hidden rounded-xl border border-[#252d38] bg-[#151c26]">
                      <div className="flex items-center justify-between bg-[#1b2734] px-4 py-3">
                        <h3 className="text-sm font-black">GROUP {group}</h3>
                        <span className="text-[10px] font-bold tracking-wider text-slate-500">
                          LEAGUE TABLE
                        </span>
                      </div>

                      <div className="grid grid-cols-[25px_minmax(0,1fr)_32px_35px_38px_35px] gap-1 border-b border-[#252d38] px-3 py-3 text-[10px] font-bold text-slate-500 sm:grid-cols-[35px_minmax(0,1fr)_40px_45px_45px_40px_40px]">
                        <span>#</span>
                        <span>TEAM</span>
                        <span>P</span>
                        <span>GD</span>
                        <span>PTS</span>
                        <span>W</span>
                      </div>

                      {standings.filter((team) => team.group === group).map((team, index) => (
                        <div
                          key={team.team}
                          className="grid grid-cols-[25px_minmax(0,1fr)_32px_35px_38px_35px] gap-1 border-b border-[#252d38] px-3 py-3 text-xs last:border-0 sm:grid-cols-[35px_minmax(0,1fr)_40px_45px_45px_40px_40px]"
                        >
                          <span className={index === 0 ? "font-black text-emerald-400" : "text-slate-500"}>
                            {index + 1}
                          </span>
                          <strong className="truncate">{team.team}</strong>
                          <span className="text-slate-400">{team.played}</span>
                          <span className="text-slate-400">{team.gd}</span>
                          <strong className="text-emerald-400">{team.points}</strong>
                          <span className="text-slate-400">{team.won}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  <p className="text-xs text-slate-500">
                    Tables are calculated from completed group-stage matches.
                  </p>
                </div>
              )}

              {/* TOP SCORERS */}
              {tab === "Top scorers" && (
                <div>
                  <SectionTitle>
                    <Goal size={19} className="text-emerald-400" />
                    Golden Boot standings
                  </SectionTitle>

                  <div className="overflow-hidden rounded-xl border border-[#252d38] bg-[#151c26]">
                    <div className="grid grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)_45px] gap-2 bg-[#1b2734] px-4 py-3 text-[10px] font-bold text-slate-500">
                      <span>#</span>
                      <span>PLAYER</span>
                      <span>TEAM</span>
                      <span>G</span>
                    </div>

                    {scorers.length ? scorers.map((scorer, index) => (
                      <div
                        key={`${scorer.player}-${scorer.team}`}
                        className="grid grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)_45px] gap-2 border-t border-[#252d38] px-4 py-4 text-xs"
                      >
                        <span className="font-bold text-slate-500">{index + 1}</span>
                        <strong className="truncate">{scorer.player}</strong>
                        <span className="truncate text-slate-400">{scorer.team}</span>
                        <strong className="text-emerald-400">{scorer.goals}</strong>
                      </div>
                    )) : (
                      <p className="p-6 text-sm text-slate-500">
                        Goalscorer rankings will appear after goals are recorded.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TEAMS */}
              {tab === "Teams" && (
                <div>
                  <SectionTitle>
                    <Users size={19} className="text-emerald-400" />
                    Participating teams
                  </SectionTitle>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {teams.map((team) => (
                      <div
                        key={team.id}
                        className="flex items-center gap-3 rounded-xl border border-[#252d38] bg-[#151c26] p-4 transition hover:border-emerald-700"
                      >
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#243345] text-sm font-black text-emerald-400">
                          {team.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <strong className="text-sm">{team.name}</strong>
                          <p className="mt-1 text-xs text-slate-500">
                            Group {team.group}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* RIGHT SIDEBAR */}
        <aside className="space-y-5">
          <div className="rounded-xl border border-[#252d38] bg-[#151c26] p-4">
            <SectionTitle>
              <Trophy size={17} className="text-amber-400" />
              Group leaders
            </SectionTitle>

            {groups.map((group) => {
              const leader = standings
                .filter((team) => team.group === group)
                .sort((a, b) => b.points - a.points || b.gd - a.gd)[0];

              return (
                <div
                  key={group}
                  className="flex items-center justify-between border-b border-[#252d38] py-3 last:border-0"
                >
                  <div>
                    <p className="text-[10px] font-bold text-slate-500">
                      GROUP {group}
                    </p>
                    <strong className="text-sm">
                      {leader?.team || "Awaiting results"}
                    </strong>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">
                    {leader ? `${leader.points} pts` : "—"}
                  </span>
                </div>
              );
            })}
            <button
              onClick={() => setTab("Standings")}
              className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300"
            >
              Full standings <ChevronRight size={14} />
            </button>
          </div>

          <div className="rounded-xl border border-[#252d38] bg-[#151c26] p-4">
            <SectionTitle>
              <Goal size={17} className="text-emerald-400" />
              Top scorers
            </SectionTitle>

            {scorers.length ? scorers.slice(0, 5).map((scorer, index) => (
              <div
                key={`${scorer.player}-${scorer.team}`}
                className="flex items-center justify-between border-b border-[#252d38] py-3 last:border-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-xs font-bold text-slate-500">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold">{scorer.player}</p>
                    <p className="truncate text-[10px] text-slate-500">{scorer.team}</p>
                  </div>
                </div>
                <strong className="text-sm text-emerald-400">{scorer.goals}</strong>
              </div>
            )) : (
              <p className="text-xs text-slate-500">No goals recorded yet.</p>
            )}

            <button
              onClick={() => setTab("Top scorers")}
              className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300"
            >
              Full rankings <ChevronRight size={14} />
            </button>
          </div>

          <div className="rounded-xl border border-[#252d38] bg-gradient-to-br from-[#163c2b] to-[#151c26] p-4">
            <div className="mb-3 flex items-center gap-2 text-emerald-400">
              <Zap size={17} />
              <span className="text-xs font-black tracking-wider">THE ROAD TO GLORY</span>
            </div>
            <p className="text-xl font-black">12 Teams.</p>
            <p className="text-xl font-black">One Trophy.</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Follow the journey to crown the champions of Olokoro.
            </p>
          </div>

          <div className="rounded-xl border border-[#252d38] bg-[#151c26] p-4">
            <p className="mb-3 text-xs font-black tracking-wider text-slate-400">
              COMPETITION SUMMARY
            </p>
            {[
              ["Total teams", teams.length || 12],
              ["Total matches", matches.length || 20],
              ["Completed", finished.length],
              ["Total goals", totalGoals],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-[#252d38] py-3 text-xs last:border-0">
                <span className="text-slate-400">{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-[#252d38] bg-[#111720]">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row lg:px-6">
          <p>
            <strong className="text-slate-300">OLOKORO FOOTBALL LEAGUE 2026</strong>
            {" "}· The village. The pride. The game.
          </p>
          <p>Made for the Olokoro community.</p>
        </div>
      </footer>
    </main>
  );
}


"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Goal,
  Radio,
  Shield,
  Trophy,
  AlertCircle,
} from "lucide-react";

function formatDate(value) {
  if (!value) return "Date to be confirmed";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date to be confirmed";

  return date.toLocaleString("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusLabel(status) {
  const labels = {
    scheduled: "UPCOMING",
    live: "LIVE",
    halftime: "HALF TIME",
    finished: "FULL TIME",
  };

  return labels[status] || "MATCH CENTRE";
}

function EventIcon({ type }) {
  if (type === "goal") {
    return <Goal size={17} className="text-emerald-400" />;
  }

  if (type === "yellow") {
    return (
      <span className="inline-block h-4 w-3 rounded-sm bg-yellow-400" />
    );
  }

  if (type === "red") {
    return (
      <span className="inline-block h-4 w-3 rounded-sm bg-red-500" />
    );
  }

  return <Clock3 size={16} className="text-slate-400" />;
}

function eventLabel(type) {
  if (type === "goal") return "GOAL";
  if (type === "yellow") return "YELLOW CARD";
  if (type === "red") return "RED CARD";
  return String(type || "MATCH EVENT").toUpperCase();
}

function MatchEvent({ event, index }) {
  const isHome = event.teamName === event.homeTeam;

  return (
    <div className="relative flex items-center gap-4 py-4">
      <div className="w-12 shrink-0 text-right text-sm font-black tabular-nums text-slate-300">
        {event.minute ? `${event.minute}'` : "—"}
      </div>

      <div className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-700 bg-[#102236]">
        <EventIcon type={event.type} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold tracking-wider text-slate-400">
          {eventLabel(event.type)}
        </p>
        <p className="mt-1 truncate font-bold text-white">
          {event.playerName || "Unknown player"}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          {event.teamName || "Team not specified"}
        </p>
      </div>

      {event.type === "goal" && (
        <span className="text-xs font-bold text-emerald-400">GOAL</span>
      )}
    </div>
  );
}

export default function MatchPage() {
  const params = useParams();
  const matchId = params?.id;

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!matchId) return;

    const unsubscribe = onSnapshot(
      doc(db, "matches", matchId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setMatch(null);
          setError("This match could not be found.");
        } else {
          setMatch({ id: snapshot.id, ...snapshot.data() });
          setError("");
        }

        setLoading(false);
      },
      (err) => {
        console.error("Match listener error:", err);
        setError("Unable to load this match. Please refresh the page.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [matchId]);

  const events = useMemo(() => {
    if (!match?.events) return [];

    return [...match.events].sort((a, b) => {
      const minuteA = Number(a.minute) || 0;
      const minuteB = Number(b.minute) || 0;

      if (minuteA !== minuteB) return minuteA - minuteB;

      return String(a.createdAt || "").localeCompare(
        String(b.createdAt || "")
      );
    });
  }, [match]);

  const goals = events.filter((event) => event.type === "goal");
  const cards = events.filter(
    (event) => event.type === "yellow" || event.type === "red"
  );

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#071321] text-slate-300">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
          <p className="text-sm">Loading match centre...</p>
        </div>
      </main>
    );
  }

  if (error || !match) {
    return (
      <main className="min-h-screen bg-[#071321] px-4 py-16 text-white">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-[#0c1d30] p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-red-400" size={32} />
          <h1 className="text-xl font-black">Match unavailable</h1>
          <p className="mt-2 text-sm text-slate-400">
            {error || "We couldn't find this fixture."}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950"
          >
            <ArrowLeft size={16} /> Back to league
          </Link>
        </div>
      </main>
    );
  }

  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const hasScore = isLive || isFinished || match.status === "halftime";

  return (
    <main className="min-h-screen bg-[#071321] text-white">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#091a2b]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3 text-sm font-bold text-slate-300 hover:text-white">
            <ArrowLeft size={18} />
            <span>All matches</span>
          </Link>

          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500 font-black text-slate-950">
              OF
            </span>
            <span className="text-sm font-black tracking-tight">
              OLOKORO <span className="text-emerald-400">2026</span>
            </span>
          </Link>
        </div>
      </header>

      <section className="border-b border-slate-800 bg-gradient-to-br from-[#103a36] via-[#0b2537] to-[#071321]">
        <div className="mx-auto max-w-5xl px-4 pb-10 pt-7 md:pb-14">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-[.2em] text-emerald-400">
                OLOKORO FOOTBALL LEAGUE
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {match.round || "Competition match"}
                {match.group ? ` · Group ${match.group}` : ""}
              </p>
            </div>

            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black tracking-wider ${
                isLive
                  ? "bg-emerald-400/15 text-emerald-300"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {isLive && (
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              )}
              {statusLabel(match.status)}
            </span>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-8">
            <div className="text-center">
              <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/5 md:h-24 md:w-24">
                <Shield size={34} className="text-emerald-400 md:hidden" />
                <Shield size={46} className="hidden text-emerald-400 md:block" />
              </div>
              <h1 className="break-words text-lg font-black md:text-2xl">
                {match.homeTeam || "Home team"}
              </h1>
              <p className="mt-1 text-xs text-slate-400">HOME</p>
            </div>

            <div className="min-w-[90px] text-center md:min-w-[150px]">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-4 md:px-6 md:py-5">
                <p className="text-3xl font-black tabular-nums md:text-5xl">
                  {hasScore
                    ? `${match.homeScore ?? 0} - ${match.awayScore ?? 0}`
                    : "VS"}
                </p>
                <p className="mt-2 text-[10px] font-black tracking-[.18em] text-slate-400">
                  {statusLabel(match.status)}
                </p>
              </div>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/5 md:h-24 md:w-24">
                <Shield size={34} className="text-sky-400 md:hidden" />
                <Shield size={46} className="hidden text-sky-400 md:block" />
              </div>
              <h2 className="break-words text-lg font-black md:text-2xl">
                {match.awayTeam || "Away team"}
              </h2>
              <p className="mt-1 text-xs text-slate-400">AWAY</p>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-slate-300">
            <span className="flex items-center gap-2">
              <CalendarDays size={14} className="text-emerald-400" />
              {formatDate(match.date)}
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-7 lg:grid-cols-[1fr_300px]">
        <section className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0c1d30]">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <h2 className="flex items-center gap-2 font-black">
                <Radio size={18} className="text-emerald-400" />
                Match timeline
              </h2>
              <span className="text-xs text-slate-500">
                {events.length} event{events.length === 1 ? "" : "s"}
              </span>
            </div>

            {events.length > 0 ? (
              <div className="relative px-5 py-2">
                <div className="absolute bottom-7 left-[3.95rem] top-7 w-px bg-slate-700" />
                {events.map((event, index) => (
                  <MatchEvent
                    key={`${event.createdAt || "event"}-${index}`}
                    event={event}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <Clock3 className="mx-auto mb-3 text-slate-600" size={28} />
                <p className="font-bold text-slate-300">No match events yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Goals and cards will appear here when recorded by the league admin.
                </p>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0c1d30]">
            <div className="border-b border-slate-800 px-5 py-4">
              <h2 className="font-black">Match information</h2>
            </div>
            <div className="divide-y divide-slate-800">
              <div className="flex justify-between gap-4 px-5 py-4 text-sm">
                <span className="text-slate-400">Competition</span>
                <span className="text-right font-bold">Olokoro Football League 2026</span>
              </div>
              <div className="flex justify-between gap-4 px-5 py-4 text-sm">
                <span className="text-slate-400">Round</span>
                <span className="text-right font-bold">{match.round || "Not specified"}</span>
              </div>
              <div className="flex justify-between gap-4 px-5 py-4 text-sm">
                <span className="text-slate-400">Group</span>
                <span className="text-right font-bold">
                  {match.group ? `Group ${match.group}` : "Knockout stage"}
                </span>
              </div>
              <div className="flex justify-between gap-4 px-5 py-4 text-sm">
                <span className="text-slate-400">Match status</span>
                <span className="text-right font-bold">{statusLabel(match.status)}</span>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-[#0c1d30] p-5">
            <h2 className="mb-4 flex items-center gap-2 font-black">
              <Trophy size={18} className="text-yellow-400" />
              Match summary
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Goals</span>
                <b className="text-emerald-400">{goals.length}</b>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Yellow cards</span>
                <b>{cards.filter((event) => event.type === "yellow").length}</b>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Red cards</span>
                <b className="text-red-400">
                  {cards.filter((event) => event.type === "red").length}
                </b>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0c1d30] p-5">
            <h2 className="mb-3 font-black">About this match</h2>
            <p className="text-sm leading-6 text-slate-400">
              Follow the action in the Olokoro Football League. Match scores and
              recorded events update automatically as the administrator
              publishes them.
            </p>
          </div>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-slate-300 transition hover:border-emerald-500 hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to all fixtures
          </Link>
        </aside>
      </div>

      <footer className="border-t border-slate-800 px-4 py-7 text-center text-xs text-slate-500">
        OLOKORO FOOTBALL LEAGUE 2026 · THE VILLAGE. THE PRIDE. THE GAME.
      </footer>
    </main>
  );
}

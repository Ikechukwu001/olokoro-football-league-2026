
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { LockKeyhole, LogOut, ArrowLeft, RefreshCw } from "lucide-react";

async function adminFetch(url, options = {}) {
  const user = auth.currentUser;

  if (!user) throw new Error("Please sign in again.");

  const token = await user.getIdToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

function formatDate(value) {
  if (!value) return "Date not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date not set";

  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminPage() {
  const [user, setUser] = useState(undefined);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState("");

  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState("");

  const [player, setPlayer] = useState("");
  const [team, setTeam] = useState("home");
  const [minute, setMinute] = useState("");
  const [eventType, setEventType] = useState("goal");
  const [editingEvent, setEditingEvent] = useState(null);
  const [homeScore, setHomeScore] = useState("0");
  const [awayScore, setAwayScore] = useState("0");

  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  // Authentication listener
  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
  }, []);

  // Load matches only when authentication changes.
  // Changing the selected match will NOT restart this listener.
  useEffect(() => {
    if (!user) {
      setMatches([]);
      setSelected("");
      setMatchesLoading(false);
      return;
    }

    setMatchesLoading(true);
    setMatchesError("");

    const unsubscribe = onSnapshot(
      collection(db, "matches"),
      (snapshot) => {
        const rows = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        rows.sort((a, b) => {
          const dateA = new Date(a.date || 0).getTime();
          const dateB = new Date(b.date || 0).getTime();
          return dateA - dateB;
        });

        setMatches(rows);

        // Keep the current selection if it still exists.
        // Otherwise select the first available fixture.
        setSelected((previous) => {
          if (rows.some((match) => match.id === previous)) {
            return previous;
          }

          return rows[0]?.id || "";
        });

        setMatchesLoading(false);
        setMatchesError("");
      },
      (error) => {
        console.error("Firestore matches error:", error);
        setMatchesError(error.message || "Could not load fixtures.");
        setMatchesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const current = matches.find((match) => match.id === selected);
  useEffect(() => {
  if (!current) return;

  setHomeScore(String(current.homeScore ?? 0));
  setAwayScore(String(current.awayScore ?? 0));
}, [current?.id, current?.homeScore, current?.awayScore]);

  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(status) {
    if (!selected) {
      setMessage("Select a match first.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      await adminFetch(`/api/admin/matches/${selected}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setMessage(`Match marked ${status}.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveResult(e) {
  e.preventDefault();

  if (!selected) {
    setMessage("Select a match first.");
    return;
  }

  const home = Number(homeScore);
  const away = Number(awayScore);

  if (
    !Number.isSafeInteger(home) ||
    !Number.isSafeInteger(away) ||
    home < 0 ||
    away < 0
  ) {
    setMessage("Enter valid scores.");
    return;
  }

  setBusy(true);
  setMessage("");

  try {
    await adminFetch(`/api/admin/matches/${selected}`, {
      method: "PATCH",
      body: JSON.stringify({
        homeScore: home,
        awayScore: away,
      }),
    });

    setMessage("Match result saved successfully.");
  } catch (error) {
    setMessage(error.message);
  } finally {
    setBusy(false);
  }
}
  async function addEvent(e) {
    e.preventDefault();

    if (!selected) {
      setMessage("Select a match first.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      await adminFetch(`/api/admin/matches/${selected}/events`, {
        method: "POST",
        body: JSON.stringify({
          type: eventType,
          playerName: player.trim(),
          side: team,
          minute: minute ? Number(minute) : null,
        }),
      });

      setPlayer("");
      setMinute("");
      setMessage("Match event saved.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }


async function saveEventEdit(e) {
  e.preventDefault();

  if (!editingEvent || !selected) return;

  setBusy(true);
  setMessage("");

  try {
    await adminFetch(`/api/admin/matches/${selected}/events`, {
      method: "PATCH",
      body: JSON.stringify({
        eventIndex: editingEvent.index,
        type: editingEvent.type,
        playerName: editingEvent.playerName,
        side: editingEvent.side,
        minute: editingEvent.minute,
      }),
    });

    setEditingEvent(null);
    setMessage("Match event updated successfully.");
  } catch (error) {
    setMessage(error.message);
  } finally {
    setBusy(false);
  }
}

async function deleteEvent(index) {
  if (!selected) return;

  const confirmed = window.confirm(
    "Are you sure you want to delete this match event?"
  );

  if (!confirmed) return;

  setBusy(true);
  setMessage("");

  try {
    await adminFetch(`/api/admin/matches/${selected}/events`, {
      method: "DELETE",
      body: JSON.stringify({ eventIndex: index }),
    });

    if (editingEvent?.index === index) {
      setEditingEvent(null);
    }

    setMessage("Match event deleted successfully.");
  } catch (error) {
    setMessage(error.message);
  } finally {
    setBusy(false);
  }
}


  if (user === undefined) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#071321] text-slate-400">
        Loading administrator...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#071321] px-4 text-white">
        <form
          onSubmit={login}
          className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-7"
        >
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400"
          >
            <ArrowLeft size={15} /> Public website
          </Link>

          <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-emerald-600">
            <LockKeyhole />
          </div>

          <h1 className="text-2xl font-black">League administration</h1>

          <p className="mb-6 mt-2 text-sm text-slate-400">
            Sign in with your authorized administrator account.
          </p>

          <label className="mb-2 block text-sm">Email</label>
          <input
            className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-emerald-500"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="mb-2 block text-sm">Password</label>
          <input
            className="mb-5 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-emerald-500"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {message && (
            <p className="mb-4 text-sm text-red-300">{message}</p>
          )}

          <button
            disabled={busy}
            className="w-full rounded-lg bg-emerald-500 p-3 font-black text-slate-950 disabled:opacity-50"
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#071321] px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-sm text-emerald-400">
              ← Public website
            </Link>
            <h1 className="mt-2 text-3xl font-black">Admin dashboard</h1>
            <p className="text-sm text-slate-400">
              Manage Olokoro Football League 2026
            </p>
          </div>

          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>

        {message && (
          <p className="mb-4 rounded-lg border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-300">
            {message}
          </p>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">Match control</h2>

            <span className="text-xs text-slate-400">
              {matches.length} fixtures found
            </span>
          </div>

          <label className="mb-2 block text-sm text-slate-300">
            Select match
          </label>

          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setMessage("");
            }}
            disabled={matchesLoading || matches.length === 0}
            className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {matchesLoading ? (
              <option value="">Loading fixtures...</option>
            ) : matches.length === 0 ? (
              <option value="">No fixtures found in Firestore</option>
            ) : (
              matches.map((match) => (
                <option key={match.id} value={match.id}>
                  {match.round || "Match"} · {match.homeTeam || "Home"} vs{" "}
                  {match.awayTeam || "Away"} · {formatDate(match.date)}
                </option>
              ))
            )}
          </select>

          {matchesLoading && (
            <p className="mb-4 text-sm text-slate-400">
              <RefreshCw size={14} className="mr-2 inline animate-spin" />
              Loading fixtures from Firebase...
            </p>
          )}

          {matchesError && (
            <div className="mb-5 rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
              <b>Could not load matches.</b>
              <p className="mt-1">{matchesError}</p>
              <p className="mt-2 text-xs text-red-200/70">
                Check your Firestore rules and browser console.
              </p>
            </div>
          )}

          {!matchesLoading && !matchesError && matches.length === 0 && (
            <div className="mb-5 rounded-lg border border-yellow-800 bg-yellow-950/30 p-4 text-sm text-yellow-200">
              No match documents were found in the Firestore matches
              collection. The admin cannot select fixtures until those
              documents exist.
            </div>
          )}

          {current && (
            <>
              <div className="mb-5 rounded-xl bg-slate-950 p-4 text-center">
                <p className="text-sm text-slate-400">
                  {current.round || "Competition match"}
                  {current.group ? ` · Group ${current.group}` : ""}
                </p>

                <div className="my-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <b>{current.homeTeam}</b>

                  <strong className="text-2xl tabular-nums">
                    {current.homeScore ?? 0} - {current.awayScore ?? 0}
                  </strong>

                  <b>{current.awayTeam}</b>
                </div>

                <p className="text-xs uppercase text-emerald-400">
                  {current.status || "scheduled"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(current.date)}
                </p>
              </div>

<form
  onSubmit={saveResult}
  className="mb-5 rounded-xl border border-slate-700 bg-slate-950 p-4"
>
  <h3 className="mb-4 font-bold text-lg">Enter Match Result</h3>

  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
    <div>
      <label className="mb-2 block text-xs text-slate-400">
        {current.homeTeam}
      </label>
      <input
        type="number"
        min="0"
        step="1"
        required
        value={homeScore}
        onChange={(e) => setHomeScore(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-center text-2xl font-black"
      />
    </div>

    <span className="text-xl font-bold text-slate-500">:</span>

    <div>
      <label className="mb-2 block text-xs text-slate-400">
        {current.awayTeam}
      </label>
      <input
        type="number"
        min="0"
        step="1"
        required
        value={awayScore}
        onChange={(e) => setAwayScore(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-center text-2xl font-black"
      />
    </div>
  </div>

  <button
    type="submit"
    disabled={busy}
    className="mt-4 w-full rounded-lg bg-emerald-500 p-3 font-black text-slate-950 disabled:opacity-50"
  >
    {busy ? "Saving Result..." : "Save Match Result"}
  </button>

  <p className="mt-2 text-center text-xs text-slate-500">
    Saving the score also marks the match as finished.
  </p>
</form>


              <div className="mb-5 flex flex-wrap gap-2">
                {["live", "halftime", "finished", "scheduled"].map((status) => (
                  <button
                    key={status}
                    disabled={busy}
                    onClick={() => updateStatus(status)}
                    className={`rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50 ${
                      current.status === status
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800 hover:bg-slate-700"
                    }`}
                  >
                    {status === "live"
                      ? "Start match"
                      : status === "halftime"
                        ? "Half-time"
                        : status === "finished"
                          ? "Full-time"
                          : "Reset to scheduled"}
                  </button>
                ))}
              </div>

              <form
                onSubmit={addEvent}
                className="space-y-3 border-t border-slate-800 pt-5"
              >
                <h3 className="font-bold">Record match event</h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">
                      Event
                    </label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                    >
                      <option value="goal">Goal</option>
                      <option value="yellow">Yellow card</option>
                      <option value="red">Red card</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-400">
                      Team
                    </label>
                    <select
                      value={team}
                      onChange={(e) => setTeam(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                    >
                      <option value="home">{current.homeTeam}</option>
                      <option value="away">{current.awayTeam}</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-400">
                      Player name
                    </label>
                    <input
                      value={player}
                      onChange={(e) => setPlayer(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                      placeholder="Enter player name"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-400">
                      Minute
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="130"
                      value={minute}
                      onChange={(e) => setMinute(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                      placeholder="e.g. 34"
                    />
                  </div>
                </div>

                <button
                  disabled={busy || !player.trim()}
                  className="rounded-lg bg-emerald-500 px-5 py-3 font-black text-slate-950 disabled:opacity-50"
                >
                  {busy ? "Saving..." : "Save event"}
                </button>
              </form>

              
            </>
          )}
<div className="mt-5 border-t border-slate-800 pt-4">
  <h3 className="mb-4 font-bold">Recorded Events</h3>

  {(current?.events || []).length > 0 ? (
    <div className="space-y-3">
      {(current?.events || []).map((event, index) => (
        <div
          key={event.id || event.createdAt || index}
          className="rounded-xl border border-slate-700 bg-slate-950 p-4"
        >
          {editingEvent?.index === index ? (
            <form onSubmit={saveEventEdit} className="space-y-3">
              <h4 className="font-bold text-emerald-400">
                Edit Match Event
              </h4>

              <select
                value={editingEvent.type}
                onChange={(e) =>
                  setEditingEvent({
                    ...editingEvent,
                    type: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3"
              >
                <option value="goal">Goal</option>
                <option value="yellow">Yellow card</option>
                <option value="red">Red card</option>
              </select>

              <input
                value={editingEvent.playerName}
                onChange={(e) =>
                  setEditingEvent({
                    ...editingEvent,
                    playerName: e.target.value,
                  })
                }
                required
                placeholder="Player name"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3"
              />

              <select
                value={editingEvent.side}
                onChange={(e) =>
                  setEditingEvent({
                    ...editingEvent,
                    side: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3"
              >
                <option value="home">{current.homeTeam}</option>
                <option value="away">{current.awayTeam}</option>
              </select>

              <input
                type="number"
                min="1"
                max="130"
                value={editingEvent.minute}
                onChange={(e) =>
                  setEditingEvent({
                    ...editingEvent,
                    minute: e.target.value,
                  })
                }
                placeholder="Match minute"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3"
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-emerald-500 px-4 py-2 font-bold text-slate-950 disabled:opacity-50"
                >
                  Save Changes
                </button>

                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="rounded-lg bg-slate-700 px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold">
                  {event.minute ? `${event.minute}' ` : ""}
                  {event.type === "goal"
                    ? "⚽ GOAL"
                    : event.type === "yellow"
                      ? "🟨 YELLOW CARD"
                      : "🟥 RED CARD"}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  {event.playerName} · {event.teamName || event.side}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setEditingEvent({
                      index,
                      type: event.type,
                      playerName: event.playerName || "",
                      side: event.side || "home",
                      minute: event.minute ?? "",
                    })
                  }
                  className="rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  Edit
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => deleteEvent(index)}
                  className="rounded-lg border border-red-800 px-3 py-2 text-sm text-red-400 hover:bg-red-950 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  ) : (
    <p className="text-sm text-slate-500">
      No events recorded yet.
    </p>
  )}
</div>

        </section>

        <p className="mt-5 text-xs text-slate-500">
          Only the Firebase UID configured as ADMIN_UID can make changes.
          Never expose your service-account key in frontend code.
        </p>
      </div>
    </main>
  );
}

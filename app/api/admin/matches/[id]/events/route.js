
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import { adminDb } from "../../../../../../lib/firebase-admin";
import { requireAdmin } from "../../../../../../lib/admin-auth";

const validTypes = ["goal", "yellow", "red"];
const validSides = ["home", "away"];

function validateEvent(body) {
  const { type, playerName, side, minute } = body;

  if (!validTypes.includes(type)) {
    throw new Error("Invalid event type.");
  }

  if (!playerName || !playerName.trim()) {
    throw new Error("Player name is required.");
  }

  if (!validSides.includes(side)) {
    throw new Error("Choose a valid team.");
  }

  let parsedMinute = null;

  if (minute !== null && minute !== undefined && minute !== "") {
    parsedMinute = Number(minute);

    if (
      !Number.isInteger(parsedMinute) ||
      parsedMinute < 1 ||
      parsedMinute > 130
    ) {
      throw new Error("Minute must be between 1 and 130.");
    }
  }

  return {
    type,
    playerName: playerName.trim(),
    side,
    minute: parsedMinute,
  };
}

function getScoreField(side) {
  return side === "home" ? "homeScore" : "awayScore";
}

function adjustScores(match, oldEvent, newEvent) {
  const homeScore = Number(match.homeScore || 0);
  const awayScore = Number(match.awayScore || 0);

  let homeChange = 0;
  let awayChange = 0;

  if (oldEvent?.type === "goal") {
    if (oldEvent.side === "home") homeChange--;
    if (oldEvent.side === "away") awayChange--;
  }

  if (newEvent?.type === "goal") {
    if (newEvent.side === "home") homeChange++;
    if (newEvent.side === "away") awayChange++;
  }

  const nextHome = homeScore + homeChange;
  const nextAway = awayScore + awayChange;

  if (nextHome < 0 || nextAway < 0) {
    throw new Error(
      "Score correction is not possible. Check the existing match score."
    );
  }

  return {
    homeScore: nextHome,
    awayScore: nextAway,
  };
}

// RECORD A NEW EVENT
export async function POST(request, { params }) {
  try {
    await requireAdmin(request);

    const { id } = await params;
    const body = await request.json();
    const details = validateEvent(body);

    const ref = adminDb.collection("matches").doc(id);

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);

      if (!snap.exists) throw new Error("Match not found.");

      const match = snap.data();

      const event = {
        ...details,
        id: randomUUID(),
        teamName:
          details.side === "home"
            ? match.homeTeam
            : match.awayTeam,
        createdAt: new Date().toISOString(),
      };

      const update = {
        events: FieldValue.arrayUnion(event),
        updatedAt: new Date().toISOString(),
      };

      if (event.type === "goal") {
        const field = getScoreField(event.side);
        update[field] = Number(match[field] || 0) + 1;
      }

      tx.update(ref, update);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Could not save event." },
      { status: error.status || 500 }
    );
  }
}

// EDIT AN EXISTING EVENT
export async function PATCH(request, { params }) {
  try {
    await requireAdmin(request);

    const { id } = await params;
    const body = await request.json();
    const { eventId, eventIndex } = body;

    const details = validateEvent(body);
    const ref = adminDb.collection("matches").doc(id);

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);

      if (!snap.exists) throw new Error("Match not found.");

      const match = snap.data();
      const events = [...(match.events || [])];

      const index = eventId
        ? events.findIndex((event) => event.id === eventId)
        : Number(eventIndex);

      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= events.length
      ) {
        throw new Error("Event not found.");
      }

      const oldEvent = events[index];

      const updatedEvent = {
        ...oldEvent,
        ...details,
        teamName:
          details.side === "home"
            ? match.homeTeam
            : match.awayTeam,
        updatedAt: new Date().toISOString(),
      };

      events[index] = updatedEvent;

      const scores = adjustScores(match, oldEvent, updatedEvent);

      tx.update(ref, {
        events,
        ...scores,
        updatedAt: new Date().toISOString(),
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Could not update event." },
      { status: error.status || 500 }
    );
  }
}

// DELETE AN EXISTING EVENT
export async function DELETE(request, { params }) {
  try {
    await requireAdmin(request);

    const { id } = await params;
    const body = await request.json();
    const { eventId, eventIndex } = body;

    const ref = adminDb.collection("matches").doc(id);

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);

      if (!snap.exists) throw new Error("Match not found.");

      const match = snap.data();
      const events = [...(match.events || [])];

      const index = eventId
        ? events.findIndex((event) => event.id === eventId)
        : Number(eventIndex);

      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= events.length
      ) {
        throw new Error("Event not found.");
      }

      const deletedEvent = events[index];

      events.splice(index, 1);

      const scores = adjustScores(match, deletedEvent, null);

      tx.update(ref, {
        events,
        ...scores,
        updatedAt: new Date().toISOString(),
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Could not delete event." },
      { status: error.status || 500 }
    );
  }
}

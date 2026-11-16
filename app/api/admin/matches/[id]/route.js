
import { NextResponse } from "next/server";
import { adminDb } from "../../../../../lib/firebase-admin";
import { requireAdmin } from "../../../../../lib/admin-auth";

export async function PATCH(request, { params }) {
  try {
    await requireAdmin(request);

    const { id } = await params;
    const body = await request.json();

    const ref = adminDb.collection("matches").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: "Match not found." },
        { status: 404 }
      );
    }

    const update = {
      updatedAt: new Date().toISOString(),
    };

    // Update match status
    if (body.status !== undefined) {
      const allowed = ["scheduled", "live", "halftime", "finished"];

      if (!allowed.includes(body.status)) {
        return NextResponse.json(
          { error: "Invalid match status." },
          { status: 400 }
        );
      }

      update.status = body.status;
    }

    // Enter a completed match result directly
    if (
      body.homeScore !== undefined ||
      body.awayScore !== undefined
    ) {
      const homeScore = body.homeScore;
      const awayScore = body.awayScore;

      if (
        !Number.isSafeInteger(homeScore) ||
        !Number.isSafeInteger(awayScore) ||
        homeScore < 0 ||
        awayScore < 0
      ) {
        return NextResponse.json(
          { error: "Enter valid whole-number scores. Scores cannot be negative." },
          { status: 400 }
        );
      }

      update.homeScore = homeScore;
      update.awayScore = awayScore;
      update.status = "finished";
    }

    if (Object.keys(update).length === 1) {
      return NextResponse.json(
        { error: "No valid match updates supplied." },
        { status: 400 }
      );
    }

    await ref.update(update);

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unauthorized." },
      { status: error.status || 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getLearnerProfile } from "@/lib/queries/learner";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const data = await getLearnerProfile(id);

  if (!data) {
    return NextResponse.json({ error: "learner not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

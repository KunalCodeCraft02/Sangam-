import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User, { DIET_TYPES, SPICE_TOLERANCES, ALLERGY_OPTIONS } from "@/models/User";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dietType, allergies, spiceTolerance } = await request.json();

  if (!DIET_TYPES.includes(dietType)) {
    return NextResponse.json({ error: "Invalid diet type" }, { status: 400 });
  }
  if (!SPICE_TOLERANCES.includes(spiceTolerance)) {
    return NextResponse.json({ error: "Invalid spice tolerance" }, { status: 400 });
  }
  const allergyList: string[] = Array.isArray(allergies) ? allergies : [];
  if (!allergyList.every((a) => (ALLERGY_OPTIONS as readonly string[]).includes(a))) {
    return NextResponse.json({ error: "Invalid allergy selection" }, { status: 400 });
  }

  await connectToDatabase();

  await User.findByIdAndUpdate(session.user.id, {
    dietType,
    allergies: allergyList,
    spiceTolerance,
    onboardingComplete: true,
  });

  return NextResponse.json({ message: "Profile saved" }, { status: 200 });
}

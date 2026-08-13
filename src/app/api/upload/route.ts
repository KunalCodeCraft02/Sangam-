import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";

// Client-side compression targets ~100-200KB; this is a generous upper bound
// against abuse, well under Cloudinary's free-tier per-file limit.
const MAX_IMAGE_STRING_LENGTH = 6_000_000;
const UPLOAD_FOLDER = "sangam_market_logs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const image = body?.image;

  if (typeof image !== "string" || !image.startsWith("data:image/")) {
    return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
  }
  if (image.length > MAX_IMAGE_STRING_LENGTH) {
    return NextResponse.json({ error: "Image is too large" }, { status: 400 });
  }

  try {
    const result = await cloudinary.uploader.upload(image, {
      folder: UPLOAD_FOLDER,
    });
    return NextResponse.json({ url: result.secure_url }, { status: 201 });
  } catch (err) {
    console.error("Cloudinary upload failed:", err);
    return NextResponse.json({ error: "Couldn't upload the image" }, { status: 502 });
  }
}

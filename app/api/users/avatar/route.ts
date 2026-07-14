import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { resolveOwner } from "@/lib/auth";
import { AVATAR_MIME_TYPES, MAX_AVATAR_BYTES } from "@/lib/avatar-image";
import {
  cleanupUploadedAssets,
  deleteImage,
  getAvatarPublicId,
  type UploadedAsset,
  uploadImageBuffer,
} from "@/lib/cloudinary";
import { updateProfileAvatar } from "@/lib/repositories/profiles";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const owner = await resolveOwner();
  if (owner.status === "signed-out")
    return NextResponse.json(
      { success: false, error: "Authentication is required." },
      { status: 401 },
    );
  if (owner.status === "onboarding")
    return NextResponse.json(
      { success: false, error: "Complete onboarding before uploading an avatar." },
      { status: 403 },
    );

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be multipart form data." },
      { status: 400 },
    );
  }
  const avatar = formData.get("avatar");
  if (!(avatar instanceof File))
    return NextResponse.json(
      { success: false, error: "An avatar image is required." },
      { status: 400 },
    );
  if (!AVATAR_MIME_TYPES.has(avatar.type))
    return NextResponse.json(
      { success: false, error: "Please upload a JPG, PNG, or WebP image." },
      { status: 400 },
    );
  if (avatar.size > MAX_AVATAR_BYTES)
    return NextResponse.json(
      { success: false, error: "Avatar image must be 5MB or smaller." },
      { status: 400 },
    );

  let asset: UploadedAsset;
  try {
    const buffer = await sharp(Buffer.from(await avatar.arrayBuffer()))
      .rotate()
      .resize(512, 512, { fit: "cover", position: "centre" })
      .webp({ quality: 86 })
      .toBuffer();
    const publicId = `${getAvatarPublicId(owner.profile.id)}/${randomUUID()}`;
    asset = await uploadImageBuffer(buffer, publicId);
  } catch (error) {
    console.error("Unable to process or upload avatar.", error);
    return NextResponse.json(
      { success: false, error: "Unable to process avatar image." },
      { status: 500 },
    );
  }

  try {
    const updated = await updateProfileAvatar({
      profileId: owner.profile.id,
      avatarUrl: asset.secureUrl,
      avatarPublicId: asset.publicId,
    });
    if (!updated) throw new Error("Profile was not found during avatar update.");
  } catch (error) {
    await cleanupUploadedAssets([asset.publicId]);
    console.error("Unable to save avatar.", error);
    return NextResponse.json({ success: false, error: "Unable to save avatar." }, { status: 500 });
  }

  if (owner.profile.avatarPublicId && owner.profile.avatarPublicId !== asset.publicId) {
    void deleteImage(owner.profile.avatarPublicId).catch((error) =>
      console.error("Unable to delete replaced avatar.", error),
    );
  }
  return NextResponse.json({ success: true, avatarUrl: asset.secureUrl });
}

import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import {
  commitRepositoryFilesToGitHub,
  isUsingGitHubDataSource,
  readGitHubRepositoryFile,
} from "@/lib/github-json";
import { isUserAuthorized } from "@/lib/auth";
import { normalizeUserId } from "@/lib/users";

export const runtime = "nodejs";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_SIZE = 512;
const USERS_SOURCE_PATH = "lib/users.ts";
const AVATAR_MIME_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Request body must be multipart form data.",
      },
      { status: 400 },
    );
  }

  const userId = normalizeUserId(formData.get("userId"));
  const avatar = formData.get("avatar");

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: "A valid user is required.",
      },
      { status: 400 },
    );
  }

  if (!isUserAuthorized(request.headers.get("cookie"), userId)) {
    return NextResponse.json(
      {
        success: false,
        error: "Authentication is required.",
      },
      { status: 401 },
    );
  }

  if (!(avatar instanceof File)) {
    return NextResponse.json(
      {
        success: false,
        error: "An avatar image is required.",
      },
      { status: 400 },
    );
  }

  const extension = AVATAR_MIME_TYPES.get(avatar.type);

  if (!extension) {
    return NextResponse.json(
      {
        success: false,
        error: "Please upload a JPG, PNG, or WebP image.",
      },
      { status: 400 },
    );
  }

  if (avatar.size > MAX_AVATAR_BYTES) {
    return NextResponse.json(
      {
        success: false,
        error: "Avatar image must be 5MB or smaller.",
      },
      { status: 400 },
    );
  }

  const filename = `${userId}-${randomUUID().slice(0, 12)}.webp`;
  const uploadDirectory = path.join(
    process.cwd(),
    "public",
    "uploads",
    "avatars",
  );
  const localPath = path.join(uploadDirectory, filename);
  const avatarUrl = `/uploads/avatars/${filename}`;
  const repositoryAvatarPath = `public/uploads/avatars/${filename}`;

  let avatarBuffer: Buffer;

  try {
    avatarBuffer = await optimizeAvatarImage(
      Buffer.from(await avatar.arrayBuffer()),
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Unable to process avatar image.",
      },
      { status: 400 },
    );
  }

  try {
    if (isUsingGitHubDataSource()) {
      const usersSource = (
        await readGitHubRepositoryFile(USERS_SOURCE_PATH)
      ).toString("utf8");
      const nextUsersSource = updateUsersSourceAvatarUrl({
        source: usersSource,
        userId,
        avatarUrl,
      });

      await commitRepositoryFilesToGitHub({
        message: `Update avatar for ${userId}`,
        files: [
          {
            path: USERS_SOURCE_PATH,
            content: Buffer.from(nextUsersSource, "utf8"),
          },
          {
            path: repositoryAvatarPath,
            content: avatarBuffer,
          },
        ],
      });
    } else {
      const usersSourcePath = path.join(process.cwd(), USERS_SOURCE_PATH);
      const usersSource = await fs.readFile(usersSourcePath, "utf8");
      const nextUsersSource = updateUsersSourceAvatarUrl({
        source: usersSource,
        userId,
        avatarUrl,
      });

      await fs.mkdir(uploadDirectory, { recursive: true });
      await fs.writeFile(localPath, avatarBuffer);
      await fs.writeFile(usersSourcePath, nextUsersSource, "utf8");
    }

    return NextResponse.json({
      success: true,
      avatarUrl,
    });
  } catch (error) {
    console.error("Unable to upload avatar.", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to upload avatar.",
      },
      { status: 500 },
    );
  }
}

async function optimizeAvatarImage(input: Buffer) {
  return sharp(input, { limitInputPixels: 24_000_000 })
    .rotate()
    .resize(AVATAR_SIZE, AVATAR_SIZE, {
      fit: "cover",
      position: "attention",
      withoutEnlargement: true,
    })
    .webp({
      effort: 4,
      quality: 80,
    })
    .toBuffer();
}

function updateUsersSourceAvatarUrl({
  source,
  userId,
  avatarUrl,
}: {
  source: string;
  userId: string;
  avatarUrl: string;
}) {
  const userBlockPattern = new RegExp(
    `(\\{\\n\\s+id: "${escapeRegExp(userId)}",[\\s\\S]*?\\n\\s+settings:)`,
  );
  const userBlockMatch = source.match(userBlockPattern);

  if (!userBlockMatch) {
    throw new Error("Unable to find user in users source.");
  }

  const userBlockStart = userBlockMatch.index ?? 0;
  const userBlockEnd = userBlockStart + userBlockMatch[0].length;
  const userBlock = source.slice(userBlockStart, userBlockEnd);
  const avatarUrlLine = `    avatarUrl: "${avatarUrl}",`;

  if (/^\s+avatarUrl: ".*",$/m.test(userBlock)) {
    return (
      source.slice(0, userBlockStart) +
      userBlock.replace(/^\s+avatarUrl: ".*",$/m, avatarUrlLine) +
      source.slice(userBlockEnd)
    );
  }

  return (
    source.slice(0, userBlockStart) +
    userBlock.replace(
      /^(\s+avatarSeed: ".*",)$/m,
      `$1\n${avatarUrlLine}`,
    ) +
    source.slice(userBlockEnd)
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

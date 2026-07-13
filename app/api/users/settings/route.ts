import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { isUserAuthorized } from "@/lib/auth";
import {
  commitRepositoryFilesToGitHub,
  isUsingGitHubDataSource,
  readGitHubRepositoryFile,
} from "@/lib/github-json";
import {
  getUserById,
  isAppTheme,
  normalizeUserId,
  type AppTheme,
} from "@/lib/users";

export const runtime = "nodejs";

const USERS_SOURCE_PATH = "lib/users.ts";

type SettingsRequest = {
  theme?: unknown;
  userId?: unknown;
};

export async function PATCH(request: Request) {
  let body: SettingsRequest;

  try {
    body = (await request.json()) as SettingsRequest;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Request body must be valid JSON.",
      },
      { status: 400 },
    );
  }

  const userId = normalizeUserId(body.userId);

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

  if (!isAppTheme(body.theme)) {
    return NextResponse.json(
      {
        success: false,
        error: "Theme must be light or dark.",
      },
      { status: 400 },
    );
  }

  const user = getUserById(userId);

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "User was not found.",
      },
      { status: 404 },
    );
  }

  const settings = {
    ...user.settings,
    theme: body.theme,
  };

  try {
    if (isUsingGitHubDataSource()) {
      const usersSource = (
        await readGitHubRepositoryFile(USERS_SOURCE_PATH)
      ).toString("utf8");
      const nextUsersSource = updateUsersSourceTheme({
        source: usersSource,
        theme: body.theme,
        userId,
      });

      await commitRepositoryFilesToGitHub({
        message: `Update theme for ${userId}`,
        files: [
          {
            path: USERS_SOURCE_PATH,
            content: Buffer.from(nextUsersSource, "utf8"),
          },
        ],
      });
    } else {
      const usersSourcePath = path.join(process.cwd(), USERS_SOURCE_PATH);
      const usersSource = await fs.readFile(usersSourcePath, "utf8");
      const nextUsersSource = updateUsersSourceTheme({
        source: usersSource,
        theme: body.theme,
        userId,
      });

      await fs.writeFile(usersSourcePath, nextUsersSource, "utf8");
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Unable to update user settings.", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to update user settings.",
      },
      { status: 500 },
    );
  }
}

function updateUsersSourceTheme({
  source,
  theme,
  userId,
}: {
  source: string;
  theme: AppTheme;
  userId: string;
}) {
  const userBlockPattern = new RegExp(
    `(\\{\\n\\s+id: "${escapeRegExp(userId)}",[\\s\\S]*?\\n\\s+\\},\\n\\s+\\},)`,
  );
  const userBlockMatch = source.match(userBlockPattern);

  if (!userBlockMatch) {
    throw new Error("Unable to find user in users source.");
  }

  const [userBlock] = userBlockMatch;
  const settingsPattern = /(\n\s+settings:\s+\{)([\s\S]*?)(\n\s+\},\n\s+\},)$/;
  const settingsMatch = userBlock.match(settingsPattern);

  if (!settingsMatch) {
    throw new Error("Unable to find user settings in users source.");
  }

  const [, settingsStart, settingsBody, settingsEnd] = settingsMatch;
  const themeLine = `      theme: "${theme}",`;
  const nextSettingsBody = /^\s+theme: "(light|dark)",$/m.test(settingsBody)
    ? settingsBody.replace(/^\s+theme: "(light|dark)",$/m, themeLine)
    : `\n${themeLine}${settingsBody}`;
  const nextUserBlock = userBlock.replace(
    settingsPattern,
    `${settingsStart}${nextSettingsBody}${settingsEnd}`,
  );

  return source.replace(userBlock, nextUserBlock);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

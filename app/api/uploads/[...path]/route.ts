import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  isUsingGitHubDataSource,
  readGitHubRepositoryFile,
} from "@/lib/github-json";

export const runtime = "nodejs";

const YEAR_PATTERN = /^\d{4}$/;
const MONTH_PATTERN = /^\d{2}$/;
const FILENAME_PATTERN = /^\d{4}-\d{2}-\d{2}-workout-[a-z0-9-]+\.avif$/;
const AVATAR_DIRECTORY = "avatars";
const AVATAR_FILENAME_PATTERN = /^[a-z0-9-]+\.webp$/;

type UploadRouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(_request: Request, context: UploadRouteContext) {
  const params = await context.params;
  const safePath = getSafeUploadPath(params.path);

  if (!safePath) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid upload path.",
      },
      { status: 400 },
    );
  }

  const uploadPaths = getUploadPaths(safePath);

  try {
    const localImage = await fs.readFile(uploadPaths.localPath);
    return createImageResponse(localImage, safePath.contentType);
  } catch (error) {
    if (!isMissingFileError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: "Unable to read uploaded image.",
        },
        { status: 500 },
      );
    }
  }

  if (!isUsingGitHubDataSource()) {
    return NextResponse.json(
      {
        success: false,
        error: "Uploaded image was not found.",
      },
      { status: 404 },
    );
  }

  try {
    const repositoryImage = await readGitHubRepositoryFile(
      uploadPaths.repositoryPath,
    );

    return createImageResponse(repositoryImage, safePath.contentType);
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Uploaded image was not found.",
      },
      { status: 404 },
    );
  }
}

function getSafeUploadPath(segments: string[]) {
  if (segments.length === 2) {
    const [directory, filename] = segments;

    if (
      directory !== AVATAR_DIRECTORY ||
      !AVATAR_FILENAME_PATTERN.test(filename)
    ) {
      return null;
    }

    return {
      contentType: "image/webp",
      directory,
      filename,
      kind: "avatar" as const,
    };
  }

  if (segments.length !== 3) {
    return null;
  }

  const [year, month, filename] = segments;

  if (
    !YEAR_PATTERN.test(year) ||
    !MONTH_PATTERN.test(month) ||
    !FILENAME_PATTERN.test(filename)
  ) {
    return null;
  }

  return {
    contentType: "image/avif",
    kind: "workout" as const,
    year,
    month,
    filename,
  };
}

type SafeUploadPath = NonNullable<ReturnType<typeof getSafeUploadPath>>;

function getUploadPaths(safePath: SafeUploadPath) {
  if (safePath.kind === "avatar") {
    return {
      localPath: path.join(
        process.cwd(),
        "public",
        "uploads",
        "avatars",
        safePath.filename,
      ),
      repositoryPath: `public/uploads/${safePath.directory}/${safePath.filename}`,
    };
  }

  return {
    localPath: path.join(
      process.cwd(),
      "public",
      "uploads",
      safePath.year,
      safePath.month,
      safePath.filename,
    ),
    repositoryPath: `public/uploads/${safePath.year}/${safePath.month}/${safePath.filename}`,
  };
}

function createImageResponse(image: Buffer, contentType: string) {
  return new Response(new Uint8Array(image), {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Length": String(image.byteLength),
      "Content-Type": contentType,
    },
  });
}

function isMissingFileError(error: unknown) {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

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

  const localPath = path.join(
    process.cwd(),
    "public",
    "uploads",
    safePath.year,
    safePath.month,
    safePath.filename,
  );

  try {
    const localImage = await fs.readFile(localPath);
    return createAvifResponse(localImage);
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
      `public/uploads/${safePath.year}/${safePath.month}/${safePath.filename}`,
    );

    return createAvifResponse(repositoryImage);
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
    year,
    month,
    filename,
  };
}

function createAvifResponse(image: Buffer) {
  return new Response(new Uint8Array(image), {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Length": String(image.byteLength),
      "Content-Type": "image/avif",
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

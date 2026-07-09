import { promises as fs } from "node:fs";
import path from "node:path";
import type { WorkoutData } from "@/lib/workout-types";
import { validateWorkoutData } from "@/lib/workout-utils";

type GitHubFile = {
  data: WorkoutData;
  sha: string;
};

type GitHubConfig = {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  dataPath: string;
};

type CommitJsonOptions = {
  data: WorkoutData;
  sha: string;
  message: string;
};

type CommitWorkoutDataAndFilesOptions = {
  data: WorkoutData;
  expectedDataSha: string;
  files: {
    path: string;
    content: Buffer;
  }[];
  deletedFilePaths?: string[];
  message: string;
};

type CommitRepositoryFilesOptions = {
  files: {
    path: string;
    content: Buffer;
  }[];
  message: string;
};

export class GitHubJsonConflictError extends Error {
  constructor() {
    super("GitHub file update conflict.");
    this.name = "GitHubJsonConflictError";
  }
}

function getDataPath() {
  return process.env.WORKOUT_DATA_PATH || "data/workouts.json";
}

function getLocalDataPath() {
  const dataPath = getDataPath();

  if (path.isAbsolute(dataPath)) {
    return dataPath;
  }

  const dataRelativePath = dataPath.startsWith("data/")
    ? dataPath.slice("data/".length)
    : dataPath;

  return path.join(
    process.cwd(),
    "data",
    /*turbopackIgnore: true*/ dataRelativePath,
  );
}

function getGitHubConfig(): GitHubConfig | null {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    return null;
  }

  return {
    token,
    owner,
    repo,
    branch: process.env.GITHUB_BRANCH || "main",
    dataPath: getDataPath(),
  };
}

function encodeBase64(value: string) {
  return Buffer.from(value, "utf8").toString("base64");
}

function encodeBase64Buffer(value: Buffer) {
  return value.toString("base64");
}

function decodeBase64(value: string) {
  return Buffer.from(value, "base64").toString("utf8");
}

function assertGitHubObject(
  value: unknown,
): asserts value is { content: string; sha: string } {
  if (
    !value ||
    typeof value !== "object" ||
    !("content" in value) ||
    !("sha" in value) ||
    typeof value.content !== "string" ||
    typeof value.sha !== "string"
  ) {
    throw new Error("Unexpected GitHub file response.");
  }
}

function createGitHubHeaders(config: GitHubConfig) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${config.token}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function getGitHubApiBaseUrl(config: GitHubConfig) {
  return `https://api.github.com/repos/${encodeURIComponent(
    config.owner,
  )}/${encodeURIComponent(config.repo)}`;
}

function getGitHubContentsUrl(config: GitHubConfig) {
  return getGitHubContentsUrlForPath(config, config.dataPath);
}

function getGitHubContentsUrlForPath(config: GitHubConfig, filePath: string) {
  const encodedPath = filePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${getGitHubApiBaseUrl(config)}/contents/${encodedPath}`;
}

function getEncodedBranchPath(config: GitHubConfig) {
  return config.branch
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export function isUsingGitHubDataSource() {
  return getGitHubConfig() !== null;
}

export async function readWorkoutData(): Promise<WorkoutData> {
  const config = getGitHubConfig();

  if (!config) {
    const localJson = await fs.readFile(getLocalDataPath(), "utf8");
    return validateWorkoutData(JSON.parse(localJson));
  }

  return readWorkoutDataFromGitHub(config).then((file) => file.data);
}

export async function readWorkoutGitHubFile(): Promise<GitHubFile> {
  const config = getGitHubConfig();

  if (!config) {
    throw new Error("GitHub environment variables are not configured.");
  }

  return readWorkoutDataFromGitHub(config);
}

export async function readGitHubRepositoryFile(filePath: string): Promise<Buffer> {
  const config = getGitHubConfig();

  if (!config) {
    throw new Error("GitHub environment variables are not configured.");
  }

  const response = await fetch(
    `${getGitHubContentsUrlForPath(config, filePath)}?ref=${encodeURIComponent(
      config.branch,
    )}`,
    {
      headers: createGitHubHeaders(config),
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub file read failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();
  assertGitHubObject(payload);

  return Buffer.from(payload.content, "base64");
}

export async function writeWorkoutDataLocally(data: WorkoutData) {
  await fs.writeFile(
    getLocalDataPath(),
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );
}

export async function commitWorkoutDataToGitHub({
  data,
  sha,
  message,
}: CommitJsonOptions) {
  const config = getGitHubConfig();

  if (!config) {
    throw new Error("GitHub environment variables are not configured.");
  }

  const response = await fetch(getGitHubContentsUrl(config), {
    method: "PUT",
    headers: createGitHubHeaders(config),
    body: JSON.stringify({
      branch: config.branch,
      message,
      content: encodeBase64(`${JSON.stringify(data, null, 2)}\n`),
      sha,
    }),
  });

  if (response.status === 409) {
    throw new GitHubJsonConflictError();
  }

  if (!response.ok) {
    throw new Error(`GitHub update failed with status ${response.status}.`);
  }
}

export async function commitWorkoutDataAndFilesToGitHub({
  data,
  expectedDataSha,
  files,
  deletedFilePaths = [],
  message,
}: CommitWorkoutDataAndFilesOptions) {
  const config = getGitHubConfig();

  if (!config) {
    throw new Error("GitHub environment variables are not configured.");
  }

  const headSha = await readGitHubHeadSha(config);
  const currentDataSha = await readGitHubDataShaAtRef(config, headSha);

  if (currentDataSha !== expectedDataSha) {
    throw new GitHubJsonConflictError();
  }

  const baseTreeSha = await readGitHubCommitTreeSha(config, headSha);
  const dataContent = Buffer.from(`${JSON.stringify(data, null, 2)}\n`, "utf8");
  const blobs = await Promise.all([
    createGitHubBlob(config, dataContent),
    ...files.map((file) => createGitHubBlob(config, file.content)),
  ]);
  const treeSha = await createGitHubTree(config, {
    baseTreeSha,
    entries: [
      {
        path: config.dataPath,
        blobSha: blobs[0],
      },
      ...files.map((file, index) => ({
        path: file.path,
        blobSha: blobs[index + 1],
      })),
      ...deletedFilePaths.map((filePath) => ({
        path: filePath,
        blobSha: null,
      })),
    ],
  });
  const commitSha = await createGitHubCommit(config, {
    message,
    treeSha,
    parentSha: headSha,
  });

  await updateGitHubBranchRef(config, commitSha);
}

export async function commitRepositoryFilesToGitHub({
  files,
  message,
}: CommitRepositoryFilesOptions) {
  const config = getGitHubConfig();

  if (!config) {
    throw new Error("GitHub environment variables are not configured.");
  }

  const headSha = await readGitHubHeadSha(config);
  const baseTreeSha = await readGitHubCommitTreeSha(config, headSha);
  const blobs = await Promise.all(
    files.map((file) => createGitHubBlob(config, file.content)),
  );
  const treeSha = await createGitHubTree(config, {
    baseTreeSha,
    entries: files.map((file, index) => ({
      path: file.path,
      blobSha: blobs[index],
    })),
  });
  const commitSha = await createGitHubCommit(config, {
    message,
    treeSha,
    parentSha: headSha,
  });

  await updateGitHubBranchRef(config, commitSha);
}

async function readWorkoutDataFromGitHub(
  config: GitHubConfig,
): Promise<GitHubFile> {
  const response = await fetch(
    `${getGitHubContentsUrl(config)}?ref=${encodeURIComponent(config.branch)}`,
    {
      headers: createGitHubHeaders(config),
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub read failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();
  assertGitHubObject(payload);

  return {
    data: validateWorkoutData(JSON.parse(decodeBase64(payload.content))),
    sha: payload.sha,
  };
}

async function readGitHubHeadSha(config: GitHubConfig) {
  const response = await fetch(
    `${getGitHubApiBaseUrl(config)}/git/ref/heads/${getEncodedBranchPath(
      config,
    )}`,
    {
      headers: createGitHubHeaders(config),
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub ref read failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();

  if (
    !payload ||
    typeof payload !== "object" ||
    !("object" in payload) ||
    !payload.object ||
    typeof payload.object !== "object" ||
    !("sha" in payload.object) ||
    typeof payload.object.sha !== "string"
  ) {
    throw new Error("Unexpected GitHub ref response.");
  }

  return payload.object.sha;
}

async function readGitHubDataShaAtRef(config: GitHubConfig, ref: string) {
  const response = await fetch(
    `${getGitHubContentsUrl(config)}?ref=${encodeURIComponent(ref)}`,
    {
      headers: createGitHubHeaders(config),
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub data read failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();
  assertGitHubObject(payload);

  return payload.sha;
}

async function readGitHubCommitTreeSha(config: GitHubConfig, commitSha: string) {
  const response = await fetch(
    `${getGitHubApiBaseUrl(config)}/git/commits/${encodeURIComponent(commitSha)}`,
    {
      headers: createGitHubHeaders(config),
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub commit read failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();

  if (
    !payload ||
    typeof payload !== "object" ||
    !("tree" in payload) ||
    !payload.tree ||
    typeof payload.tree !== "object" ||
    !("sha" in payload.tree) ||
    typeof payload.tree.sha !== "string"
  ) {
    throw new Error("Unexpected GitHub commit response.");
  }

  return payload.tree.sha;
}

async function createGitHubBlob(config: GitHubConfig, content: Buffer) {
  const response = await fetch(`${getGitHubApiBaseUrl(config)}/git/blobs`, {
    method: "POST",
    headers: createGitHubHeaders(config),
    body: JSON.stringify({
      content: encodeBase64Buffer(content),
      encoding: "base64",
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub blob create failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();

  if (
    !payload ||
    typeof payload !== "object" ||
    !("sha" in payload) ||
    typeof payload.sha !== "string"
  ) {
    throw new Error("Unexpected GitHub blob response.");
  }

  return payload.sha;
}

async function createGitHubTree(
  config: GitHubConfig,
  {
    baseTreeSha,
    entries,
  }: {
    baseTreeSha: string;
    entries: { path: string; blobSha: string | null }[];
  },
) {
  const response = await fetch(`${getGitHubApiBaseUrl(config)}/git/trees`, {
    method: "POST",
    headers: createGitHubHeaders(config),
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: entries.map((entry) => ({
        path: entry.path,
        mode: "100644",
        type: "blob",
        sha: entry.blobSha,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub tree create failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();

  if (
    !payload ||
    typeof payload !== "object" ||
    !("sha" in payload) ||
    typeof payload.sha !== "string"
  ) {
    throw new Error("Unexpected GitHub tree response.");
  }

  return payload.sha;
}

async function createGitHubCommit(
  config: GitHubConfig,
  {
    message,
    treeSha,
    parentSha,
  }: {
    message: string;
    treeSha: string;
    parentSha: string;
  },
) {
  const response = await fetch(`${getGitHubApiBaseUrl(config)}/git/commits`, {
    method: "POST",
    headers: createGitHubHeaders(config),
    body: JSON.stringify({
      message,
      tree: treeSha,
      parents: [parentSha],
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub commit create failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();

  if (
    !payload ||
    typeof payload !== "object" ||
    !("sha" in payload) ||
    typeof payload.sha !== "string"
  ) {
    throw new Error("Unexpected GitHub commit create response.");
  }

  return payload.sha;
}

async function updateGitHubBranchRef(config: GitHubConfig, commitSha: string) {
  const response = await fetch(
    `${getGitHubApiBaseUrl(config)}/git/refs/heads/${getEncodedBranchPath(
      config,
    )}`,
    {
      method: "PATCH",
      headers: createGitHubHeaders(config),
      body: JSON.stringify({
        sha: commitSha,
        force: false,
      }),
    },
  );

  if (response.status === 409 || response.status === 422) {
    throw new GitHubJsonConflictError();
  }

  if (!response.ok) {
    throw new Error(`GitHub ref update failed with status ${response.status}.`);
  }
}

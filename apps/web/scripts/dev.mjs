import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

const appDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const monorepoRoot = resolve(appDirectory, "../..");

// Next only auto-loads env files from apps/web. Load the shared monorepo config
// before starting Next so server-side modules can access DATABASE_URL at runtime.
nextEnv.loadEnvConfig(monorepoRoot);
nextEnv.loadEnvConfig(appDirectory);

const nextBin = resolve(appDirectory, "node_modules/next/dist/bin/next");
const nextArgs = process.argv.slice(2);
if (nextArgs[0] === "--") nextArgs.shift();

const child = spawn(process.execPath, [nextBin, "dev", ...nextArgs], {
  env: process.env,
  stdio: "inherit",
});

child.once("exit", (code) => process.exit(code ?? 1));

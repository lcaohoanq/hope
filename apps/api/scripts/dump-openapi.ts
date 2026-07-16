import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateSpecs } from "hono-openapi";
import { routes } from "../src/index";
import { openApiDocumentation } from "../src/openapi";

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, "../../../apps/docs/static/openapi.json");

const specs = await generateSpecs(routes, {
  documentation: openApiDocumentation,
  exclude: ["/openapi.json", "/reference"],
});

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(specs, null, 2)}\n`, "utf8");
console.log(`Wrote OpenAPI spec to ${outPath}`);

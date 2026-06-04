const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

// __dirname is always the repo root regardless of Vercel's build CWD
const repoRoot = __dirname;
const src = path.join(repoRoot, "artifacts", "visa-crm", "dist");

if (!fs.existsSync(path.join(src, "index.html"))) {
  console.error("ERROR: build output not found at", src);
  process.exit(1);
}

// ─── Compile api/team-members.ts serverless function ────────────────────────
const funcSrc = path.join(repoRoot, "api", "team-members.ts");
const tempBundle = path.join(repoRoot, "_tm_bundle.cjs");

const isWin = process.platform === "win32";
const esbuildBin = path.join(
  repoRoot, "artifacts", "api-server", "node_modules", ".bin",
  isWin ? "esbuild.cmd" : "esbuild"
);

const buildResult = spawnSync(
  esbuildBin,
  [funcSrc, "--bundle", "--platform=node", "--target=node20", "--format=cjs", `--outfile=${tempBundle}`],
  { stdio: "inherit", cwd: repoRoot }
);

if (buildResult.status !== 0) {
  console.error("ERROR: Failed to build api/team-members.ts");
  process.exit(1);
}

// esbuild CJS emits exports.default; Vercel needs module.exports = the handler
const bundleCode =
  fs.readFileSync(tempBundle, "utf8") +
  "\nmodule.exports = exports.default || module.exports;\n";
fs.rmSync(tempBundle);
console.log("✓ Built api/team-members serverless function");

// ─── Vercel output config ────────────────────────────────────────────────────
const config = {
  version: 3,
  routes: [
    { handle: "filesystem" },
    { src: "/api/team-members", dest: "/api/team-members" },
    { src: "/(.*)", dest: "/index.html" },
  ],
};

const vcFuncConfig = JSON.stringify({ runtime: "nodejs20.x", handler: "index.js" });

// Write to both repo root and process.cwd() so Vercel finds it wherever it looks
const destinations = Array.from(
  new Set([
    path.join(repoRoot, ".vercel", "output"),
    path.join(process.cwd(), ".vercel", "output"),
  ])
);

for (const dest of destinations) {
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(path.join(dest, "config.json"), JSON.stringify(config));

  // Static SPA files
  const staticDest = path.join(dest, "static");
  fs.rmSync(staticDest, { recursive: true, force: true });
  fs.cpSync(src, staticDest, { recursive: true });

  // Serverless function
  const funcDir = path.join(dest, "functions", "api", "team-members.func");
  fs.mkdirSync(funcDir, { recursive: true });
  fs.writeFileSync(path.join(funcDir, "index.js"), bundleCode);
  fs.writeFileSync(path.join(funcDir, ".vc-config.json"), vcFuncConfig);

  console.log("✓ Wrote Vercel output to", dest);
}

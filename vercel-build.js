const fs = require("fs");
const path = require("path");

// This script lives at the repo root, so __dirname is always the repo root,
// regardless of the CWD Vercel uses to run the build (it uses artifacts/api-server).
const repoRoot = __dirname;
const src = path.join(repoRoot, "artifacts", "visa-crm", "dist");

if (!fs.existsSync(path.join(src, "index.html"))) {
  console.error("ERROR: build output not found at", src);
  process.exit(1);
}

const config = {
  version: 3,
  routes: [
    { handle: "filesystem" },
    { src: "/(.*)", dest: "/index.html" }
  ]
};

// Vercel may look for .vercel/output at the repo root OR at the build CWD
// (its Root Directory points at artifacts/api-server). Write to both.
const destinations = Array.from(
  new Set([
    path.join(repoRoot, ".vercel", "output"),
    path.join(process.cwd(), ".vercel", "output")
  ])
);

for (const dest of destinations) {
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(path.join(dest, "config.json"), JSON.stringify(config));
  const staticDest = path.join(dest, "static");
  fs.rmSync(staticDest, { recursive: true, force: true });
  fs.cpSync(src, staticDest, { recursive: true });
  console.log("\u2713 Wrote Vercel output to", dest);
}

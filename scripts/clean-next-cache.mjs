import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

function hasSuspiciousName(name) {
  // Finder-style duplicate names: "app 2", "manifest 3.json", etc.
  return /\s+\d+(\.|$)/.test(name);
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(dir, predicate) {
  const files = [];
  if (!(await pathExists(dir))) return files;

  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath, predicate)));
      continue;
    }
    if (predicate(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function hasBrokenAppPathManifest(serverDir) {
  const manifestPath = path.join(serverDir, "app-paths-manifest.json");
  if (!(await pathExists(manifestPath))) return false;

  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch {
    // A malformed manifest means cache is unusable.
    return true;
  }

  const mappedFiles = Object.values(manifest).filter(
    (value) => typeof value === "string"
  );

  for (const relativeFilePath of mappedFiles) {
    const absoluteFilePath = path.join(serverDir, relativeFilePath);
    if (!(await pathExists(absoluteFilePath))) {
      return true;
    }
  }

  return false;
}

async function hasMissingVendorChunkFiles(serverDir) {
  const appServerDir = path.join(serverDir, "app");
  const appJsFiles = await walkFiles(appServerDir, (name) =>
    name.endsWith(".js")
  );

  if (appJsFiles.length === 0) return false;

  const referencedVendorChunks = new Set();
  const vendorChunkPattern = /["'](vendor-chunks\/[A-Za-z0-9@._/-]+)["']/g;

  for (const filePath of appJsFiles) {
    const source = await fs.readFile(filePath, "utf8");
    let match;
    while ((match = vendorChunkPattern.exec(source)) !== null) {
      referencedVendorChunks.add(match[1]);
    }
  }

  for (const chunkId of referencedVendorChunks) {
    const chunkFilePath = path.join(serverDir, `${chunkId}.js`);
    if (!(await pathExists(chunkFilePath))) {
      return true;
    }
  }

  return false;
}

async function shouldCleanNextDir(nextDir) {
  if (!existsSync(nextDir)) return false;

  const serverDir = path.join(nextDir, "server");
  if (!existsSync(serverDir)) return false;

  const entries = await fs.readdir(serverDir, { withFileTypes: true });
  const names = entries.map((entry) => entry.name);

  const hasDuplicateNamedArtifacts = names.some(
    (name) =>
      hasSuspiciousName(name) ||
      /^app\s+\d+$/.test(name) ||
      /^chunks\s+\d+$/.test(name)
  );

  const hasMissingCanonicalDirs =
    !names.includes("app") &&
    names.some((name) => /^app\s+\d+$/.test(name));

  if (hasDuplicateNamedArtifacts || hasMissingCanonicalDirs) {
    return true;
  }

  if (await hasBrokenAppPathManifest(serverDir)) {
    return true;
  }

  if (await hasMissingVendorChunkFiles(serverDir)) {
    return true;
  }

  return false;
}

async function main() {
  const projectRoot = process.cwd();
  const nextDir = path.join(projectRoot, ".next");

  if (!(await shouldCleanNextDir(nextDir))) {
    return;
  }

  await fs.rm(nextDir, { recursive: true, force: true });
  // Keep this concise: this script runs automatically before dev.
  console.log("[predev] Removed corrupted .next cache.");
}

main().catch((error) => {
  console.warn("[predev] .next cleanup check failed:", error);
});

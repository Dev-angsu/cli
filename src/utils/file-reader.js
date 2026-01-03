import glob from "fast-glob";
import ignore from "ignore";
import fs from "fs";
import path from "path";
import { isBinaryFile } from "isbinaryfile";

export async function getValidFiles(dir) {
  const ig = ignore();

  // 1. Default Ignores (Standard noise)
  ig.add([
    ".git",
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".DS_Store",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    ".env",
    ".env.local",
    "*.png",
    "*.jpg",
    "*.jpeg",
    "*.gif",
    "*.ico",
    "*.svg", // Images
  ]);

  // 2. Load .gitignore if exists
  const gitignorePath = path.join(dir, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
    ig.add(gitignoreContent);
  }

  // 3. Scan Files (Fast Glob)
  const allFiles = await glob("**/*", {
    cwd: dir,
    dot: true,
    ignore: ["**/node_modules/**", "**/.git/**"], // Optimization: Hard ignore
    onlyFiles: true,
  });

  // 4. Filter Results
  const validFiles = [];
  for (const file of allFiles) {
    // Check .gitignore rules
    if (ig.ignores(file)) continue;

    // Check if Binary (prevents garbage text)
    const isBinary = await isBinaryFile(path.join(dir, file));
    if (!isBinary) validFiles.push(file);
  }

  return validFiles;
}

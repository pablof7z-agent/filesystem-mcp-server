import { execSync } from "node:child_process";
import { config } from "../config/index.js";
import { logger } from "../utils/internal/logger.js";
import { requestContextService } from "../utils/internal/requestContext.js";

const GIT_HINT =
  "\n\n---\n💡 Your working tree has uncommitted changes. Run `git_status` to see them, and `git_commit` when you're ready to snapshot your work.";

let lastCheck = 0;
let cachedDirty = false;
const CACHE_MS = 2000;

export function isGitTreeDirty(): boolean {
  const now = Date.now();
  if (now - lastCheck < CACHE_MS) return cachedDirty;

  const cwd = config.fsBaseDirectory;
  if (!cwd) {
    cachedDirty = false;
    lastCheck = now;
    return false;
  }

  try {
    const ctx = requestContextService.createRequestContext({ operation: "gitHintCheck" });
    const output = execSync("git status --porcelain", {
      cwd,
      timeout: 3000,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    cachedDirty = output.trim().length > 0;
    logger.debug(`gitHint: tree dirty=${cachedDirty}`, ctx);
  } catch {
    cachedDirty = false;
  }
  lastCheck = now;
  return cachedDirty;
}

export function getGitHint(): string {
  return isGitTreeDirty() ? GIT_HINT : "";
}

export function appendGitHint(text: string): string {
  return isGitTreeDirty() ? text + GIT_HINT : text;
}
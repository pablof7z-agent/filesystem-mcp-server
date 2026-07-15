import { execSync } from "node:child_process";
import { z } from "zod";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { logger } from "../../../utils/internal/logger.js";
import { RequestContext } from "../../../utils/internal/requestContext.js";
import { serverState } from "../../state.js";
import { appendGitHint } from "../../gitHint.js";

export const GitCommitInputSchema = z.object({
  message: z.string().min(1).describe("The commit message."),
  all: z.boolean().optional().default(false).describe("If true, stage all changed files before committing (git add -A). Default: false (only commit already-staged files)."),
});

export type GitCommitInput = z.infer<typeof GitCommitInputSchema>;

export interface GitCommitOutput {
  message: string;
  commitHash: string;
}

export const gitCommitLogic = async (
  input: GitCommitInput,
  context: RequestContext,
): Promise<GitCommitOutput> => {
  const cwd = serverState.resolvePath(".", context);
  logger.debug(`gitCommitLogic: committing in "${cwd}" with message "${input.message}"`, context);

  try {
    if (input.all) {
      execSync("git add -A", { cwd, timeout: 5000, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    }

    execSync(`git commit -m ${JSON.stringify(input.message)}`, {
      cwd,
      timeout: 5000,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    const hash = execSync("git rev-parse --short HEAD", {
      cwd,
      timeout: 5000,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    return {
      message: `Committed as ${hash}: ${input.message}`,
      commitHash: hash,
    };
  } catch (error: any) {
    const stderr = error.stderr || "";
    if (stderr.includes("nothing to commit") || stderr.includes("no changes added to commit")) {
      return { message: "Nothing to commit — working tree clean or no staged changes.", commitHash: "" };
    }
    if (stderr.includes("not a git repository")) {
      throw new McpError(
        BaseErrorCode.VALIDATION_ERROR,
        "The workspace is not a git repository.",
        { ...context, cwd },
      );
    }
    throw new McpError(
      BaseErrorCode.INTERNAL_ERROR,
      `git commit failed: ${error.message}`,
      { ...context, cwd, originalError: error },
    );
  }
};
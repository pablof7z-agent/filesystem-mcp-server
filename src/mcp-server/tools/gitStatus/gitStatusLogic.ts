import { execSync } from "node:child_process";
import { z } from "zod";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { logger } from "../../../utils/internal/logger.js";
import { RequestContext } from "../../../utils/internal/requestContext.js";
import { serverState } from "../../state.js";
import { appendGitHint } from "../../gitHint.js";

export const GitStatusInputSchema = z.object({});

export type GitStatusInput = z.infer<typeof GitStatusInputSchema>;

export interface GitStatusOutput {
  message: string;
  clean: boolean;
}

export const gitStatusLogic = async (
  input: GitStatusInput,
  context: RequestContext,
): Promise<GitStatusOutput> => {
  const cwd = serverState.resolvePath(".", context);
  logger.debug(`gitStatusLogic: checking status in "${cwd}"`, context);

  try {
    const output = execSync("git status --porcelain", {
      cwd,
      timeout: 5000,
      encoding: "utf8",
    });
    const clean = output.trim().length === 0;
    const message = clean
      ? "Working tree is clean."
      : appendGitHint(output.trim());
    return { message, clean };
  } catch (error: any) {
    if (error.stderr && error.stderr.includes("not a git repository")) {
      throw new McpError(
        BaseErrorCode.VALIDATION_ERROR,
        "The workspace is not a git repository. Initialize one with `git init`.",
        { ...context, cwd },
      );
    }
    throw new McpError(
      BaseErrorCode.INTERNAL_ERROR,
      `git status failed: ${error.message}`,
      { ...context, cwd, originalError: error },
    );
  }
};
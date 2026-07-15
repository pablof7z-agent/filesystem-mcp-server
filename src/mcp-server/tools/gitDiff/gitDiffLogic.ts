import { execSync } from "node:child_process";
import { z } from "zod";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { logger } from "../../../utils/internal/logger.js";
import { RequestContext } from "../../../utils/internal/requestContext.js";
import { serverState } from "../../state.js";
import { appendGitHint } from "../../gitHint.js";

export const GitDiffInputSchema = z.object({
  staged: z.boolean().optional().default(false).describe("If true, show only staged changes (git diff --cached). Default: false (show unstaged changes)."),
  path: z.string().optional().describe("Optional file path to diff. If omitted, shows all changes."),
});

export type GitDiffInput = z.infer<typeof GitDiffInputSchema>;

export interface GitDiffOutput {
  message: string;
}

export const gitDiffLogic = async (
  input: GitDiffInput,
  context: RequestContext,
): Promise<GitDiffOutput> => {
  const cwd = serverState.resolvePath(".", context);
  const flag = input.staged ? "--cached" : "";
  const fileArg = input.path ? serverState.resolvePath(input.path, context) : "";
  logger.debug(`gitDiffLogic: diff in "${cwd}" staged=${input.staged} path=${fileArg}`, context);

  try {
    const cmd = `git diff ${flag} ${fileArg ? JSON.stringify(fileArg) : ""}`.trim();
    const output = execSync(cmd, {
      cwd,
      timeout: 5000,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const text = output.trim();
    return { message: text || "No changes." };
  } catch (error: any) {
    if ((error.stderr || "").includes("not a git repository")) {
      throw new McpError(
        BaseErrorCode.VALIDATION_ERROR,
        "The workspace is not a git repository.",
        { ...context, cwd },
      );
    }
    throw new McpError(
      BaseErrorCode.INTERNAL_ERROR,
      `git diff failed: ${error.message}`,
      { ...context, cwd, originalError: error },
    );
  }
};
import { execSync } from "node:child_process";
import { z } from "zod";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { logger } from "../../../utils/internal/logger.js";
import { RequestContext } from "../../../utils/internal/requestContext.js";
import { serverState } from "../../state.js";
import { appendGitHint } from "../../gitHint.js";

export const GitLogInputSchema = z.object({
  count: z.number().int().min(1).max(50).optional().default(10).describe("Number of recent commits to show. Default: 10, max: 50."),
});

export type GitLogInput = z.infer<typeof GitLogInputSchema>;

export interface GitLogOutput {
  message: string;
}

export const gitLogLogic = async (
  input: GitLogInput,
  context: RequestContext,
): Promise<GitLogOutput> => {
  const cwd = serverState.resolvePath(".", context);
  const count = input.count ?? 10;
  logger.debug(`gitLogLogic: fetching ${count} commits in "${cwd}"`, context);

  try {
    const output = execSync(
      `git log --oneline --no-decorate -${count}`,
      { cwd, timeout: 5000, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
    );
    return { message: output.trim() || "No commits yet." };
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
      `git log failed: ${error.message}`,
      { ...context, cwd, originalError: error },
    );
  }
};
import { execSync } from "node:child_process";
import { z } from "zod";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { logger } from "../../../utils/internal/logger.js";
import { RequestContext } from "../../../utils/internal/requestContext.js";
import { serverState } from "../../state.js";
import { appendGitHint } from "../../gitHint.js";

export const GitInputSchema = z.object({
  args: z.array(z.string()).min(1).describe("Arguments passed to git (e.g. [\"add\",\"-A\"] or [\"log\",\"--oneline\",\"-5\"] or [\"commit\",\"-m\",\"fix typo\"]). Do not include the \"git\" command itself."),
});

export type GitInput = z.infer<typeof GitInputSchema>;

export interface GitOutput {
  message: string;
}

const DANGEROUS = ["push", "reset --hard", "clean -fd", "checkout --", "filter-branch", "reflog expire"];

export const gitLogic = async (
  input: GitInput,
  context: RequestContext,
): Promise<GitOutput> => {
  const cwd = serverState.resolvePath(".", context);
  const args = input.args;

  const cmd = `git ${args.map(a => JSON.stringify(a)).join(" ")}`;
  logger.debug(`gitLogic: running "${cmd}" in "${cwd}"`, context);

  const joined = args.join(" ");
  for (const danger of DANGEROUS) {
    if (joined.startsWith(danger) || joined.includes(" " + danger)) {
      logger.warning(`gitLogic: potentially dangerous command blocked: ${joined}`, { ...context, cmd: joined });
      throw new McpError(
        BaseErrorCode.FORBIDDEN,
        `Command "${joined}" is blocked for safety. Run it manually via SSH if needed.`,
        { ...context, cwd, cmd: joined },
      );
    }
  }

  try {
    const output = execSync(cmd, {
      cwd,
      timeout: 10000,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const text = output.trim();
    return { message: text || "(no output)" };
  } catch (error: any) {
    const stderr = (error.stderr || "").trim();
    if (stderr.includes("not a git repository")) {
      throw new McpError(
        BaseErrorCode.VALIDATION_ERROR,
        "The workspace is not a git repository.",
        { ...context, cwd },
      );
    }
    if (stderr) {
      return { message: stderr };
    }
    throw new McpError(
      BaseErrorCode.INTERNAL_ERROR,
      `git failed: ${error.message}`,
      { ...context, cwd, cmd: joined, originalError: error },
    );
  }
};
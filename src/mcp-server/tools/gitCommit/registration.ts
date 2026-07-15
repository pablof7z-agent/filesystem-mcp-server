import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BaseErrorCode } from "../../../types-global/errors.js";
import { ErrorHandler } from "../../../utils/internal/errorHandler.js";
import { logger } from "../../../utils/internal/logger.js";
import { requestContextService } from "../../../utils/internal/requestContext.js";
import { GitCommitInputSchema, gitCommitLogic } from "./gitCommitLogic.js";

export const registerGitCommitTool = async (server: McpServer): Promise<void> => {
  const registrationContext = requestContextService.createRequestContext({ operation: "RegisterGitCommitTool" });
  logger.info("Attempting to register 'git_commit' tool", registrationContext);

  await ErrorHandler.tryCatch(
    async () => {
      server.tool(
        "git_commit",
        "Creates a git commit in the workspace repository. By default commits only already-staged files; set all=true to stage all changes first (git add -A). Returns the new commit hash.",
        GitCommitInputSchema.shape,
        async (params, _extra) => {
          const callContext = requestContextService.createRequestContext({ operation: "GitCommitToolExecution", parentId: registrationContext.requestId });
          logger.info(`Executing 'git_commit' tool with message: ${params.message}`, callContext);
          const result = await ErrorHandler.tryCatch(
            () => gitCommitLogic(params, callContext),
            { operation: "gitCommitLogic", context: callContext, errorCode: BaseErrorCode.INTERNAL_ERROR },
          );
          return { content: [{ type: "text" as const, text: result.message }] };
        },
      );
      logger.info("'git_commit' tool registered successfully", registrationContext);
    },
    { operation: "registerGitCommitTool", context: registrationContext, errorCode: BaseErrorCode.CONFIGURATION_ERROR, critical: true },
  );
};
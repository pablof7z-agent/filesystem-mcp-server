import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BaseErrorCode } from "../../../types-global/errors.js";
import { ErrorHandler } from "../../../utils/internal/errorHandler.js";
import { logger } from "../../../utils/internal/logger.js";
import { requestContextService } from "../../../utils/internal/requestContext.js";
import { GitDiffInputSchema, gitDiffLogic } from "./gitDiffLogic.js";

export const registerGitDiffTool = async (server: McpServer): Promise<void> => {
  const registrationContext = requestContextService.createRequestContext({ operation: "RegisterGitDiffTool" });
  logger.info("Attempting to register 'git_diff' tool", registrationContext);

  await ErrorHandler.tryCatch(
    async () => {
      server.tool(
        "git_diff",
        "Shows uncommitted changes in the workspace git repository. By default shows unstaged changes; set staged=true to see staged (cached) changes. Optionally filter by a file path.",
        GitDiffInputSchema.shape,
        async (params, _extra) => {
          const callContext = requestContextService.createRequestContext({ operation: "GitDiffToolExecution", parentId: registrationContext.requestId });
          logger.info("Executing 'git_diff' tool", callContext);
          const result = await ErrorHandler.tryCatch(
            () => gitDiffLogic(params, callContext),
            { operation: "gitDiffLogic", context: callContext, errorCode: BaseErrorCode.INTERNAL_ERROR },
          );
          return { content: [{ type: "text" as const, text: result.message }] };
        },
      );
      logger.info("'git_diff' tool registered successfully", registrationContext);
    },
    { operation: "registerGitDiffTool", context: registrationContext, errorCode: BaseErrorCode.CONFIGURATION_ERROR, critical: true },
  );
};
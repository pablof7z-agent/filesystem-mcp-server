import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BaseErrorCode } from "../../../types-global/errors.js";
import { ErrorHandler } from "../../../utils/internal/errorHandler.js";
import { logger } from "../../../utils/internal/logger.js";
import { requestContextService } from "../../../utils/internal/requestContext.js";
import { GitStatusInputSchema, gitStatusLogic } from "./gitStatusLogic.js";

export const registerGitStatusTool = async (server: McpServer): Promise<void> => {
  const registrationContext = requestContextService.createRequestContext({ operation: "RegisterGitStatusTool" });
  logger.info("Attempting to register 'git_status' tool", registrationContext);

  await ErrorHandler.tryCatch(
    async () => {
      server.tool(
        "git_status",
        "Shows the working tree status of the git repository at the workspace root. Returns a list of changed files (staged and unstaged). Use this to see what has been modified before committing.",
        GitStatusInputSchema.shape,
        async (_params, _extra) => {
          const callContext = requestContextService.createRequestContext({ operation: "GitStatusToolExecution", parentId: registrationContext.requestId });
          logger.info("Executing 'git_status' tool", callContext);
          const result = await ErrorHandler.tryCatch(
            () => gitStatusLogic({}, callContext),
            { operation: "gitStatusLogic", context: callContext, errorCode: BaseErrorCode.INTERNAL_ERROR },
          );
          return { content: [{ type: "text" as const, text: result.message }] };
        },
      );
      logger.info("'git_status' tool registered successfully", registrationContext);
    },
    { operation: "registerGitStatusTool", context: registrationContext, errorCode: BaseErrorCode.CONFIGURATION_ERROR, critical: true },
  );
};
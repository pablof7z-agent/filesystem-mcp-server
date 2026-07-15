import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BaseErrorCode } from "../../../types-global/errors.js";
import { ErrorHandler } from "../../../utils/internal/errorHandler.js";
import { logger } from "../../../utils/internal/logger.js";
import { requestContextService } from "../../../utils/internal/requestContext.js";
import { GitLogInputSchema, gitLogLogic } from "./gitLogLogic.js";

export const registerGitLogTool = async (server: McpServer): Promise<void> => {
  const registrationContext = requestContextService.createRequestContext({ operation: "RegisterGitLogTool" });
  logger.info("Attempting to register 'git_log' tool", registrationContext);

  await ErrorHandler.tryCatch(
    async () => {
      server.tool(
        "git_log",
        "Shows recent git commit history (oneline format) for the workspace repository. Accepts an optional count (default 10, max 50).",
        GitLogInputSchema.shape,
        async (params, _extra) => {
          const callContext = requestContextService.createRequestContext({ operation: "GitLogToolExecution", parentId: registrationContext.requestId });
          logger.info("Executing 'git_log' tool", callContext);
          const result = await ErrorHandler.tryCatch(
            () => gitLogLogic(params, callContext),
            { operation: "gitLogLogic", context: callContext, errorCode: BaseErrorCode.INTERNAL_ERROR },
          );
          return { content: [{ type: "text" as const, text: result.message }] };
        },
      );
      logger.info("'git_log' tool registered successfully", registrationContext);
    },
    { operation: "registerGitLogTool", context: registrationContext, errorCode: BaseErrorCode.CONFIGURATION_ERROR, critical: true },
  );
};
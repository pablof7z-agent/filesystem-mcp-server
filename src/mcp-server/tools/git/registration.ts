import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BaseErrorCode } from "../../../types-global/errors.js";
import { ErrorHandler } from "../../../utils/internal/errorHandler.js";
import { logger } from "../../../utils/internal/logger.js";
import { requestContextService } from "../../../utils/internal/requestContext.js";
import { GitInputSchema, gitLogic } from "./gitLogic.js";

export const registerGitTool = async (server: McpServer): Promise<void> => {
  const registrationContext = requestContextService.createRequestContext({ operation: "RegisterGitTool" });
  logger.info("Attempting to register 'git' tool", registrationContext);

  await ErrorHandler.tryCatch(
    async () => {
      server.tool(
        "git",
        "Runs an arbitrary git command in the workspace repository. Pass arguments as an array (without the 'git' prefix), e.g. {\"args\":[\"status\",\"--porcelain\"]} or {\"args\":[\"commit\",\"-m\",\"add feature\"]} or {\"args\":[\"log\",\"--oneline\",\"-10\"]}. Dangerous commands (push, reset --hard, clean -fd, filter-branch) are blocked.",
        GitInputSchema.shape,
        async (params, _extra) => {
          const callContext = requestContextService.createRequestContext({ operation: "GitToolExecution", parentId: registrationContext.requestId });
          logger.info(`Executing 'git' tool: ${params.args.join(" ")}`, callContext);
          const result = await ErrorHandler.tryCatch(
            () => gitLogic(params, callContext),
            { operation: "gitLogic", context: callContext, errorCode: BaseErrorCode.INTERNAL_ERROR },
          );
          return { content: [{ type: "text" as const, text: result.message }] };
        },
      );
      logger.info("'git' tool registered successfully", registrationContext);
    },
    { operation: "registerGitTool", context: registrationContext, errorCode: BaseErrorCode.CONFIGURATION_ERROR, critical: true },
  );
};
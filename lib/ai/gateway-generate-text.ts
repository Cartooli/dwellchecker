import { generateText } from "ai";
import { logger } from "@/lib/logging/logger";

type GenTextParams = Parameters<typeof generateText>[0];

export type GatewayGenerateTextParams = GenTextParams & {
  /** Stable label for structured logs and regression correlation (not sent to the model). */
  operation: string;
};

/**
 * Single entry point for `generateText` in this app: retries/token usage stay delegated to the AI SDK,
 * while we add consistent observability and avoid scattering direct SDK imports.
 */
export function gatewayGenerateText(params: GatewayGenerateTextParams) {
  const { operation, onFinish, ...rest } = params;
  const wallStartedAt = Date.now();

  return generateText({
    ...(rest as GenTextParams),
    onFinish: async (event) => {
      await onFinish?.(event);
      logger.info("llm-generate-finished", {
        operation,
        wallMs: Date.now() - wallStartedAt,
        finishReason: event.finishReason,
        totalUsage: event.totalUsage,
        responseModelId: event.response?.modelId,
      });
    },
  });
}

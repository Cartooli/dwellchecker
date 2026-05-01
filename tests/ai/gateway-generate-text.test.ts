import { describe, it, expect, vi, beforeEach } from "vitest";

const generateTextMock = vi.fn();

vi.mock("ai", () => ({
  generateText: (opts: unknown) => generateTextMock(opts),
}));

import { gatewayGenerateText } from "@/lib/ai/gateway-generate-text";

describe("gatewayGenerateText", () => {
  beforeEach(() => {
    generateTextMock.mockReset();
  });

  it("does not pass operation to the SDK and chains user onFinish", async () => {
    generateTextMock.mockImplementation(async (opts: { onFinish?: (e: unknown) => Promise<void> | void }) => {
      await opts.onFinish?.({
        finishReason: "stop",
        totalUsage: {
          inputTokens: 1,
          outputTokens: 2,
          totalTokens: 3,
          reasoningTokens: 0,
          cachedInputTokens: 0,
        },
        response: {
          modelId: "test-model",
          messages: [],
          timestamp: new Date(),
          headers: {},
        },
        steps: [],
      });
      return {
        text: "hello",
        finishReason: "stop",
        usage: {
          inputTokens: 1,
          outputTokens: 2,
          totalTokens: 3,
          reasoningTokens: 0,
          cachedInputTokens: 0,
        },
        warnings: [],
      };
    });

    const userOnFinish = vi.fn();

    await gatewayGenerateText({
      operation: "unit-test",
      model: "anthropic/claude-sonnet-4.5",
      messages: [{ role: "user", content: "ping" }],
      onFinish: userOnFinish,
    });

    expect(generateTextMock).toHaveBeenCalledTimes(1);
    const sdkArgs = generateTextMock.mock.calls[0][0] as Record<string, unknown>;
    expect(sdkArgs.operation).toBeUndefined();
    expect(sdkArgs.model).toBe("anthropic/claude-sonnet-4.5");
    expect(typeof sdkArgs.onFinish).toBe("function");
    expect(userOnFinish).toHaveBeenCalledTimes(1);
  });
});

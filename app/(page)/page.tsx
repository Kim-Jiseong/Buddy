"use client";

import { ToolInvocation } from "ai";
import { Message, useChat } from "ai/react";

export default function Chat() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    addToolResult,
    isLoading,
  } = useChat({
    api: "/api/chat",
    //  input.startsWith("/find")
    //   ? `/api/webSearch?query=${encodeURIComponent(input.slice(6))}`
    //   :
    // run client-side tools that are automatically executed:
    async onToolCall({ toolCall }) {
      if (toolCall.toolName === "getLocation") {
        const cities = ["New York", "Los Angeles", "Chicago", "San Francisco"];
        return cities[Math.floor(Math.random() * cities.length)];
      }
    },
  });

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="w-full flex flex-1 flex-col gap-4 overflow-auto p-4 pb-24">
        {messages?.map((m: Message) => (
          <div
            key={m.id}
            className={`flex ${
              m.role === "assistant" ? "justify-start" : "justify-end"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                m.role === "assistant"
                  ? "bg-white border border-gray-200"
                  : "bg-blue-500 text-white"
              }`}
            >
              <div className="text-sm opacity-50 mb-1">{m.role}</div>
              <div className="whitespace-pre-wrap">{m.content}</div>
              {m.toolInvocations?.map((toolInvocation: ToolInvocation) => {
                const toolCallId = toolInvocation.toolCallId;
                const addResult = (result: string) =>
                  addToolResult({ toolCallId, result });

                // render confirmation tool (client-side tool with user interaction)
                if (toolInvocation.toolName === "askForConfirmation") {
                  return (
                    <div key={toolCallId}>
                      {toolInvocation.args.message}
                      <div>
                        {"result" in toolInvocation ? (
                          <b>{toolInvocation.result}</b>
                        ) : (
                          <>
                            <button onClick={() => addResult("Yes")}>
                              Yes
                            </button>
                            <button onClick={() => addResult("No")}>No</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                }

                // other tools:
                return "result" in toolInvocation ? (
                  <div key={toolCallId}>
                    Tool call: {`${toolInvocation.toolName}`}
                    {/* {toolInvocation.result} */}
                  </div>
                ) : (
                  <div key={toolCallId}>
                    Calling {toolInvocation.toolName}...
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="fixed bottom-20 left-0 w-full text-center text-gray-500">
          메시지를 입력 중입니다...
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="fixed bottom-0 left-0 right-0 bg-white border-t p-4"
      >
        <div className="max-w-4xl mx-auto flex gap-4">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="메시지를 입력하세요..."
            className="flex-1 rounded-full px-4 py-2 border focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-500 text-white rounded-full px-6 py-2 hover:bg-blue-600 disabled:opacity-50"
          >
            전송
          </button>
        </div>
      </form>
    </div>
  );
}

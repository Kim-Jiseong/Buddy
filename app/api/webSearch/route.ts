// api/full-gen/route.ts
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { z } from "zod";
import { tools } from "./tools";

export const maxDuration = 60;

export async function POST(req: Request) {
  const url = new URL(req.url);
  const encodedQuery = url.searchParams.get("query") || "";
  const query = atob(encodedQuery);
  const { messages } = await req.json();
  const result = streamText({
    model: anthropic("claude-3-5-sonnet-latest"),
    messages: [
      {
        role: "system",
        content: `
        너는 세계 최고의 리서치 전문가야. 지금까지의 대화의 맥락과 유저가 요청한 검색어를 바탕으로, 유저가 원하는 정보를 추론하여 정보를 검색한 후 정리해줘.
        절대로 환각을 일으키지 마. 반드시 존재하는 정보만을 제시하고, 출처를 항상 명시해. 
        가독성을 위해 개행과 마크다운을 적절히 활용해.
        

        대화의 맥락:
        ${messages.map((m: any) => m.content).join("\n")}

        유저가 요청한 검색어:
        ${query}
        `,
        experimental_providerMetadata: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
    ],
    maxSteps: 10,
    experimental_continueSteps: true,
    tools,
    async onFinish(response) {},
  });

  return result.toDataStreamResponse({});
}

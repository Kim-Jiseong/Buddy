// api/full-gen/route.ts
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { z } from "zod";
import { tools } from "./tools";
import { WebClient } from "@slack/web-api";
import { replaceUserIdsWithInfo } from "@/utils/slack";
import { fetchConversationHistory } from "@/utils/slack";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const encodedQuery = url.searchParams.get("query") || "";
    const query = atob(encodedQuery);
    const web = new WebClient(process.env.SLACK_BOT_TOKEN);
    const { text, channel_id } = await req.json();

    // text가 비어있는 경우 처리
    const userInput = text?.trim();
    const decodedInput = userInput
      ? decodeURIComponent(userInput.replace(/\+/g, " "))
      : "";

    console.log(channel_id, decodedInput);
    const messages = await fetchConversationHistory(channel_id);
    const updatedMessages = await replaceUserIdsWithInfo(messages);
    const processedMessages = updatedMessages
      .filter((message) => message.text)
      .map((message) => ({
        role:
          message.user && message.user.name === "buddy"
            ? ("assistant" as const)
            : ("user" as const),
        content: message.text || "",
      }))
      .reverse()
      .slice(0, 10);
    // console.log(processedMessages);
    await web.chat.postMessage({
      text: "/reserve " + decodedInput,
      channel: channel_id,
    });

    // 3) 백그라운드에서 AI 응답 받기 (비동기로 실행)
    (async () => {
      try {
        // AI 스트리밍 호출
        const { textStream } = streamText({
          model: anthropic("claude-3-5-sonnet-latest"),
          messages: [
            {
              role: "system",
              content: `
       너는 세계 최고의 리서치 전문가야. 지금까지의 대화의 맥락과 유저가 요청한 검색어를 바탕으로, 유저가 원하는 정보를 추론하여 정보를 검색한 후 정리해줘.
        절대로 환각을 일으키지 마. 반드시 존재하는 정보만을 제시하고, 출처를 항상 명시해. 
        가독성을 위해 개행과 마크다운을 적절히 활용해.
        

        대화의 맥락:
        ${processedMessages}

        유저가 요청한 검색어:
        ${query}


              `,
            },
          ],
          tools,
        });

        let fullText = "";
        for await (const textPart of textStream) {
          fullText += textPart;
        }

        // 스트리밍 결과가 나오면 최종 메시지 전송
        await web.chat.postMessage({
          text: fullText.trim() || "내용이 없습니다.",
          channel: channel_id,
        });
      } catch (error) {
        console.error("비동기 AI 처리 중 에러:", error);
        await web.chat.postMessage({
          text: "에러가 발생했어요.",
          channel: channel_id,
        });
      }
    })();
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("POST 요청 실패:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

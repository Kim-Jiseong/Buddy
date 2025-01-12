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
                    너는 대단히 중요한 클라이언트인 고려대학교 학생들의 학습을 돕는 어시스턴트 "Buddy"야.
                    너는 유저의 요청에 따라 장소, 시설 등 여러 자원들을 예약하는 작업을 수행하여 유저의 학습에 문제가 없도록 지원해야해.
                    단계별로 유저의 요청을 구체화하고 도구들을 적극적으로 활용해.
                    유저의 요청이 명확하지 않다면 유저에게 명확하게 요청을 구체화하도록 요청해.
                    실제로 예약을 진행하기 전에는 반드시 유저에게 승인을 요청해.
                    가독성을 위해 개행과 마크다운을 적절히 활용해.
                    대화의 첫 시작에서는 무엇을 도와줄지 유저에게 물어봐. 처음부터 옵션을 제시하지는 마.
    
                    작업을 위해 충분한 정보를 얻지 못했을 경우 유저에게 물어봐.
                    `,
            },
            ...processedMessages,
            { role: "user", content: decodedInput || "입력값 없음" },
          ],
          //   tools,
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

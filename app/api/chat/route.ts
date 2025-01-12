// api/full-gen/route.ts
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { z } from "zod";
import { tools } from "./tools";
import { WebClient } from "@slack/web-api";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const web = new WebClient(process.env.SLACK_BOT_TOKEN);
    const formData = await req.formData();

    const userText = (formData.get("text") as string) ?? "";
    const channelId = (formData.get("channel_id") as string) ?? "";

    // 1) '잠시만 기다려주세요...' 안내 메시지를 바로 보냄
    //    - 본문 Slash Command 응답이 늦어지면 에러가 뜨므로, 가능한 한 빨리 전송 후 곧바로 200 응답
    await web.chat.postMessage({
      text: "잠시만 기다려주세요...",
      channel: channelId,
    });

    // 2) 3초 내 응답을 위해 곧바로 HTTP Response(200)를 반환 (Slack에서는 이미 "성공"으로 간주)
    //    이 시점에 Slash Command 요청/응답은 완료되므로, Slack이 타임아웃을 일으키지 않음.
    const quickResponse = {
      response_type: "ephemeral", // 혹은 "in_channel" 로 바꿀 수 있음
      text: "/reserve " + userText,
    };
    // 여기서 200 OK를 즉시 return 해 줍니다.
    // (이후 로직은 백그라운드에서 수행)
    const immediateResponse = new Response(JSON.stringify(quickResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
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
                    너는 대단히 중요한 클라이언트인 고려대학교 학생들의 학습을 돕는 어시스턴트 "호랭이"야.
                    너는 유저의 요청에 따라 장소, 시설 등 여러 자원들을 예약하는 작업을 수행하여 유저의 학습에 문제가 없도록 지원해야해.
                    단계별로 유저의 요청을 구체화하고 도구들을 적극적으로 활용해.
                    유저의 요청이 명확하지 않다면 유저에게 명확하게 요청을 구체화하도록 요청해.
                    실제로 예약을 진행하기 전에는 반드시 유저에게 승인을 요청해.
                    가독성을 위해 개행과 마크다운을 적절히 활용해.
                    대화의 첫 시작에서는 무엇을 도와줄지 유저에게 물어봐. 처음부터 옵션을 제시하지는 마.
    
                    작업을 위해 충분한 정보를 얻지 못했을 경우 유저에게 물어봐.
                    `,
            },
            { role: "user", content: userText },
          ],
        });

        let fullText = "";
        for await (const textPart of textStream) {
          fullText += textPart;
        }

        // 스트리밍 결과가 나오면 최종 메시지 전송
        await web.chat.postMessage({
          text: fullText.trim() || "내용이 없습니다.",
          channel: channelId,
        });
      } catch (error) {
        console.error("비동기 AI 처리 중 에러:", error);
        await web.chat.postMessage({
          text: "에러가 발생했어요.",
          channel: channelId,
        });
      }
    })();

    // 4) Slash Command 요청에는 곧바로 200 응답.
    return immediateResponse;
  } catch (error) {
    console.error("POST 요청 실패:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

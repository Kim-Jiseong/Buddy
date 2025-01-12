// api/full-gen/route.ts
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { z } from "zod";
import { tools } from "./tools";
import { WebClient } from "@slack/web-api";
export const maxDuration = 60;

export async function POST(req: Request) {
  const web = new WebClient(process.env.SLACK_BOT_TOKEN);
  let messages;

  const contentType = req.headers.get("content-type");

  if (contentType?.includes("application/x-www-form-urlencoded")) {
    const formData = await req.formData();
    const userText = formData.get("text") as string;
    // if (userText && userText.trim()) {
    //   await web.chat.postMessage({
    //     text: "/reserve " + userText,
    //     channel: formData.get("channel_id") as string,
    //   });
    // } else {
    //   await web.chat.postMessage({
    //     text: "/reserve ",
    //     channel: formData.get("channel_id") as string,
    //   });
    // }

    await web.chat.postMessage({
      text: "잠시만 기다려주세요...",
      channel: formData.get("channel_id") as string,
    });

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
          experimental_providerMetadata: {
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        },
        { role: "user", content: userText ?? "" },
        //   ...messages,
      ],
    });

    // 텍스트 수집과 메시지 전송을 비동기로 처리
    (async () => {
      let fullText = "";

      for await (const textPart of textStream) {
        process.stdout.write(textPart);
        fullText += textPart;
      }

      if (fullText && fullText.trim()) {
        web.chat
          .postMessage({
            text: fullText,
            channel: formData.get("channel_id") as string,
          })
          .catch((error) => {
            console.error("메시지 전송 실패:", error);
          });
      }
    })();

    // 즉시 응답 반환
    return new Response("/reserve" + userText);
  } else {
    const body = await req.json();
    messages = body.messages;
    return new Response("잠시만 기다려주세요");
  }

  //   console.log("Request content-type:", contentType);
  //   console.log("Processed messages:", messages);

  //   const result = streamText({
  //     model: anthropic("claude-3-5-sonnet-latest"),
  //     messages: [
  //       {
  //         role: "system",
  //         content: `
  //         너는 대단히 중요한 클라이언트인 고려대학교 학생들의 학습을 돕는 어시스턴트 "호랭이"야.
  //         너는 유저의 요청에 따라 장소, 시설 등 여러 자원들을 예약하는 작업을 수행하여 유저의 학습에 문제가 없도록 지원해야해.
  //         단계별로 유저의 요청을 구체화하고 도구들을 적극적으로 활용해.
  //         유저의 요청이 명확하지 않다면 유저에게 명확하게 요청을 구체화하도록 요청해.
  //         실제로 예약을 진행하기 전에는 반드시 유저에게 승인을 요청해.
  //         가독성을 위해 개행과 마크다운을 적절히 활용해.
  //         대화의 첫 시작에서는 무엇을 도와줄지 유저에게 물어봐. 처음부터 옵션을 제시하지는 마.

  //         작업을 위해 충분한 정보를 얻지 못했을 경우 유저에게 물어봐.
  //         `,
  //         experimental_providerMetadata: {
  //           anthropic: { cacheControl: { type: "ephemeral" } },
  //         },
  //       },
  //       ...messages,
  //     ],
  //     maxSteps: 10,
  //     experimental_continueSteps: true,
  //     tools,
  //     async onFinish(response) {},
  //   });

  //   return result.toDataStreamResponse({});
}

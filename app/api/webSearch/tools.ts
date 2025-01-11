import { z } from "zod";
import puppeteer from "puppeteer";

export const tools = {
  searchWeb: {
    description: "검색어를 바탕으로 웹 검색을 수행하고 결과를 리턴합니다",
    parameters: z.object({
      query: z.string().describe("검색어를 여기에 입력"),
    }),
    execute: async ({ query }: { query: string }) => {
      const puppeteer = require("puppeteer");

      try {
        const results = await fetchTopResultsContent(query);
        return {
          success: true,
          content: results,
        };
      } catch (error) {
        return {
          success: false,
          content: `검색 중 오류가 발생했습니다`,
        };
      }
    },
  },

  //   getSeatsOfSpecificLibraries: {
  //     description:
  //       "고려대학교의 특정 열람실의 사용 가능한 좌석 정보를 가져옵니다.",
  //     parameters: z.object({ roomCode: z.string().describe("도서관 코드") }),
  //     execute: async () => {},
  //   },
  //   // client-side tool that starts user interaction:
  //   askForConfirmation: {
  //     description: "Ask the user for confirmation.",
  //     parameters: z.object({
  //       message: z.string().describe("The message to ask for confirmation."),
  //     }),
  //   },
  //   // client-side tool that is automatically executed on the client:
  //   getLocation: {
  //     description:
  //       "Get the user location. Always ask for confirmation before using this tool.",
  //     parameters: z.object({}),
  //   },
};

async function fetchTopResultsContent(query: string) {
  const googleSearchURL = `https://www.google.com/search?q=${encodeURIComponent(
    query
  )}`;
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  try {
    // ... fetchTopResultsContent 함수의 나머지 내용 ...
  } finally {
    await browser.close();
  }
}

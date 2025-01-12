import { z } from "zod";
import puppeteer from "puppeteer";

export const tools = {
  searchWeb: {
    description: "검색어를 바탕으로 웹 검색을 수행하고 결과를 리턴합니다",
    parameters: z.object({
      query: z.string().describe("검색어를 여기에 입력"),
    }),
    execute: async ({ query }: { query: string }) => {
      try {
        const googleSearchURL = `https://www.google.com/search?q=${encodeURIComponent(
          query
        )}`;
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(googleSearchURL, { waitUntil: "domcontentloaded" });

        // 검색 결과에서 링크 추출
        const links = await page.evaluate(() => {
          return Array.from(document.querySelectorAll(".tF2Cxc a"))
            .map((link) => {
              // 타입 단언으로 `HTMLAnchorElement` 사용
              const anchor = link as HTMLAnchorElement;
              return anchor.href;
            })
            .filter(
              (href) =>
                href.startsWith("http") &&
                !href.includes("login") &&
                !href.includes("signup")
            )
            .slice(0, 10);
        });

        const results = [];
        for (const link of links) {
          try {
            const contentPage = await browser.newPage();
            await contentPage.goto(link, { waitUntil: "domcontentloaded" });

            // 페이지에서 텍스트 추출
            const content = await contentPage.evaluate(() => {
              return Array.from(document.querySelectorAll("h1, h2, p"))
                .map((el) => {
                  // 타입 단언으로 `HTMLElement` 사용
                  const element = el as HTMLElement;
                  return element.innerText.trim();
                })
                .filter((text) => text.length > 30)
                .join(" ")
                .replace(/\s+/g, " "); // 공백 제거
            });

            if (content && content.length > 100) {
              results.push({ link, content: content.slice(0, 1000) }); // 최대 1000자로 제한
            }

            await contentPage.close();
          } catch (error) {
            console.error(`Error fetching content from ${link}:`, error);
          }
        }

        await browser.close();

        // 성공적으로 처리된 결과 반환
        return {
          success: true,
          content: results.slice(0, 5), // 상위 5개 반환
        };
      } catch (error) {
        console.error("Error during Google search:", error);

        // 에러 발생 시 실패 응답 반환
        return {
          success: false,
          content: [],
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

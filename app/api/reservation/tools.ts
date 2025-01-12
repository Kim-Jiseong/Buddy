import { z } from "zod";
import axios from "axios";

const getHeaders = () => ({
  Accept: "application/json, text/plain, */*",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Accept-Language": "ko-KR,ko;q=0.9",
  "Cache-Control": "no-cache",
  Expires: "Sat, 01 Jan 2000 00:00:00 GMT",
  Pragma: "no-cache",
  Priority: "u=1, i",
  Referer: "https://librsv.korea.ac.kr/",
  "Sec-CH-UA": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "Sec-CH-UA-Mobile": "?0",
  "Sec-CH-UA-Platform": '"macOS"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Content-Type": "application/json",
});

// 공통 쿠키 정의 함수
const getCookies = (userId: string) => {
  const cookie1 =
    "_gid=GA1.3.797485420.1736630284; _gat_gtag_UA_106967597_1=1; _gat_gtag_UA_161598556_3=1; _gat_gtag_UA_161598556_1=1; AUTH_SESSIONID=Cp5XO2foOVbOsoS-GUo38zcZY1oF24JqAt_4nXTgxIGT1iqvtZ2C!1934148258; _ga_9KSFHNQEY6=GS1.1.1736630289.1.1.1736630297.0.0.0; CLI_SID=8E4512133CDFEEEF127E20B8650B333E; _ga_T0BPMDS2QB=GS1.1.1736630283.1.1.1736630298.0.0.0; _ga_GGYFNSTLV8=GS1.1.1736630283.1.1.1736630298.45.0.0; _ga=GA1.3.1905728422.1736630284";
  const cookie2 =
    "_gid=GA1.3.1190524068.1736614143; AUTH_SESSIONID=QDFWRRb_qVigGxIZfqOKlaT_JejwiqvH0uz7Tuv8qdogy5qaYKtX!1934148258; _gat_gtag_UA_161598556_1=1; _ga_9KSFHNQEY6=GS1.1.1736614143.1.1.1736614426.0.0.0; CLI_SID=35A6CC656F66E4A97E4D8F38B761A56A; _gat_gtag_UA_106967597_1=1; _gat_gtag_UA_161598556_3=1; PORTAL_SESSIONID=wTFWSXY1YtD8xJc1j3kwWEy7BMLDZI5AJ3j8cJUTJxJtFEU_7oka!-946312163; _gat=1; _ga_NN58C7HFEQ=GS1.3.1736614441.1.0.1736614441.0.0.0; _ga=GA1.3.634969499.1736614143; _ga_T0BPMDS2QB=GS1.1.1736614428.1.1.1736614479.0.0.0; _ga_GGYFNSTLV8=GS1.1.1736614428.1.1.1736614479.9.0.0";

  return userId === "simsime" ? cookie1 : userId === "kdg" ? cookie2 : null;
};

export const tools = {
  getReservation: {
    description: "공간 예약 정보를 확인합니다",
    parameters: z.object({
      userId: z.string().describe("유저 아이디 입력"),
    }),
    execute: async ({ userId }: { userId: string }) => {
      const url = "https://librsv.korea.ac.kr/user/my-info";
      const cookies = getCookies(userId);

      if (!cookies) {
        return { success: false, content: "Invalid userId" };
      }

      try {
        const response = await axios.get(url, {
          headers: { ...getHeaders(), Cookie: cookies },
        });

        const message = response.data?.message || "UNKNOWN";

        return {
          success: message === "SUCCESS",
          content: response.data,
        };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          return {
            success: false,
            content: `Axios error: ${error.response?.status || "Unknown error"}`,
          };
        } else if (error instanceof Error) {
          return {
            success: false,
            content: `Error: ${error.message}`,
          };
        } else {
          return { success: false, content: "Unknown error occurred" };
        }
      }
    },
  },

  postReservation: {
    description: "공간을 예약합니다",
    parameters: z.object({
      userId: z.string().describe("유저 아이디 입력"),
      seatId: z.number().describe("좌석 번호 입력"),
      time: z.number().describe("시간 입력"),
    }),
    execute: async ({ userId, seatId, time }: { userId: string; seatId: number; time: number }) => {
      const url = "https://librsv.korea.ac.kr/libraries/seat";
      const cookies = getCookies(userId);

      if (!cookies) {
        return { success: false, content: "Invalid userId" };
      }

      try {
        const response = await axios.post(
          url,
          { seatId, time },
          {
            headers: { ...getHeaders(), Cookie: cookies },
          }
        );

        const message = response.data?.message || "UNKNOWN";

        return {
          success: message === "SUCCESS",
          content: response.data,
        };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          return {
            success: false,
            content: `Axios error: ${error.response?.status || "Unknown error"}`,
          };
        } else if (error instanceof Error) {
          return {
            success: false,
            content: `Error: ${error.message}`,
          };
        } else {
          return { success: false, content: "Unknown error occurred" };
        }
      }
    },
  }
};

import { z } from "zod";

export const tools = {
  getAvailableSeatsOfLibraries: {
    description:
      "고려대학교의 모든 도서관의 정보와 현재 잔여 좌석수를 확인합니다",
    parameters: z.object({}),
    execute: async () => {
      const LIBRARY_NAMES: { [key: string]: string } = {
        "1": "중앙도서관",
        "2": "중앙 광장",
        "3": "백주년기념관",
        "4": "과학도서관",
        "5": "하나스퀘어",
        "6": "법학도서관",
      };

      async function fetchLibraryData(libraryCode: string) {
        try {
          const response = await fetch(
            `https://librsv.korea.ac.kr/libraries/lib-status/${libraryCode}`
          );
          const data = await response.json();
          return data;
        } catch (error) {
          console.error(`도서관 ${libraryCode} 데이터 조회 실패:`, error);
          return null;
        }
      }

      const results = [];

      for (const [id, name] of Object.entries(LIBRARY_NAMES)) {
        const libraryData = await fetchLibraryData(id);

        if (!libraryData || !libraryData.data) continue;

        const rooms = libraryData.data.map((room: any) => ({
          roomCode: room?.code,
          name: room?.name,
          nameEng: room?.nameEng,
          availableSeats: room?.available - room?.inUse,
          noteBookYN: room?.noteBookYN,
          startTm: room?.startTm,
          endTm: room?.endTm,
        }));

        const totalAvailableSeats = rooms.reduce(
          (sum: number, room: any) => sum + room.availableSeats,
          0
        );

        results.push({
          id,
          name,
          rooms,
          totalAvailableSeats,
        });
      }

      return results;
    },
  },
  reserveLibrarySeat: {
    description: "고려대학교 특정 도서관의 특정 좌석을 랜덤하게 예약합니다.",
    parameters: z.object({
      roomCode: z.string().describe("열람실 또는 시설물의 코드"),
      duration: z.number().describe("이용 시간(분). 60인경우 1시간"),
    }),
    execute: async ({
      roomCode,
      duration,
    }: {
      roomCode: string;
      duration: number;
    }) => {
      try {
        const response = await fetch(
          `https://librsv.korea.ac.kr/libraries/seats/${roomCode}`
        );
        const data = await response.json();

        // seatTime이 null인 좌석들만 필터링
        const availableSeats = data.data.filter(
          (seat: any) => seat.seatTime === null
        );

        if (availableSeats.length === 0) {
          return {
            success: false,
            message: "현재 예약 가능한 좌석이 없습니다.",
          };
        }

        // 랜덤으로 좌석 선택
        const randomSeat =
          availableSeats[Math.floor(Math.random() * availableSeats.length)];
        console.log({
          success: true,
          message: `${randomSeat.name}번 좌석이 ${duration}분 동안 예약되었습니다.`,
          seatCode: randomSeat.code,
          duration: duration,
        });
        return {
          success: true,
          message: `${randomSeat.name}번 좌석이 ${duration}분 동안 예약되었습니다.`,
          seatCode: randomSeat.code,
          duration: duration,
        };
      } catch (error) {
        console.error("좌석 조회 실패:", error);
        return {
          success: false,
          message: "좌석 조회 중 오류가 발생했습니다.",
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

import { z } from "zod";
import axios from "axios";
import {getValueById} from "@/app/utils/createClient";
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
const getCookies = async (userId: string) => {
  console.log(userId);
  try {
    // 비동기 함수 호출 시 await 사용
    const cookie = await getValueById('Data', 1);
    console.dir(cookie.value, {depth: null}); // 데이터 확인
    return cookie.value;
  } catch (error) {
    console.error('Error:', error.message);
    return null
  }
  // const cookie1 =
  //   "_gid=GA1.3.797485420.1736630284; _gat_gtag_UA_106967597_1=1; _gat_gtag_UA_161598556_3=1; _gat_gtag_UA_161598556_1=1; AUTH_SESSIONID=Cp5XO2foOVbOsoS-GUo38zcZY1oF24JqAt_4nXTgxIGT1iqvtZ2C!1934148258; _ga_9KSFHNQEY6=GS1.1.1736630289.1.1.1736630297.0.0.0; CLI_SID=8E4512133CDFEEEF127E20B8650B333E; _ga_T0BPMDS2QB=GS1.1.1736630283.1.1.1736630298.0.0.0; _ga_GGYFNSTLV8=GS1.1.1736630283.1.1.1736630298.45.0.0; _ga=GA1.3.1905728422.1736630284";
  // const cookie2 =
  //   "_gid=GA1.3.1601756396.1736654883; _gat_gtag_UA_161598556_1=1; AUTH_SESSIONID=u81YstJx5ndow8OyYj2RUdWZ7JR3Yh0ewpTvFUuWuFBu-q4vHnf1!1934148258; _ga_9KSFHNQEY6=GS1.1.1736654882.1.1.1736654900.0.0.0; CLI_SID=A9021458148B61A91031609AA246CAE8; _ga_T0BPMDS2QB=GS1.1.1736654901.1.0.1736654901.0.0.0; _gat_gtag_UA_106967597_1=1; _gat_gtag_UA_161598556_3=1; _ga_GGYFNSTLV8=GS1.1.1736654902.1.0.1736654902.60.0.0; _ga=GA1.1.1623975955.1736654883"
  // return userId === "simsime" ? cookie1 : userId === "kdg" ? cookie2 : null;
};

type Facility = {
  code: number;
  name: string;
};

type StudyRoomLog = {
  rsrvStartTm: string;
  rsrvEndTm: string;
};

type FacilityResult = {
  facilityName: string;
  roomCode: number;
  availableSeats: number | null;
  totalSeats: number | null;
  startTm: string | null;
  endTm: string | null;
  reservationLogs: StudyRoomLog[];
  isOccupied: boolean;
};

type BuildingResult = {
  buildingName: string;
  facilities: FacilityResult[];
  totalRooms: number;
  availableRooms: number;
};

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
        console.log("parameters : " + roomCode + " " + duration)
        const response = await fetch(
          `https://librsv.korea.ac.kr/libraries/seats/${roomCode}`
        );
        const data = await response.json();
        console.log("data" + data)

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
        const seatId = randomSeat.code
        const time = duration

        const url = "https://librsv.korea.ac.kr/libraries/seat";
        const cookies = await getCookies('kdg');
  
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
          if (message === "SUCCESS") {
            return {
              success: true,
              message: `${randomSeat.name}번 좌석이 ${duration}분 동안 예약되었습니다.`,
              seatCode: randomSeat.code,
              duration: duration,
            };
          }
          else {
            return {
              success: false,
              message: "좌석 예약 중 오류가 발생했습니다.",
            };
          }
        } catch (error) {
          if (axios.isAxiosError(error)) {
            console.log(error);
            console.log(`Axios error: ${error.response?.status || "Unknown error"}, Error: ${error}`);
            return {
              success: false,
              message: "좌석 예약 중 오류가 발생했습니다.",
            };
          } else if (error instanceof Error) {
            console.log(`Error: ${error.message}`)

            return {
              success: false,
              message: "좌석 예약 중 오류가 발생했습니다.",
            };
          } else {
            return { success: false, message: "좌석 예약 중 오류가 발생했습니다."};
          }
        }
      
      } catch (error) {
        console.error("좌석 조회 실패:", error);
        return {
          success: false,
          message: "좌석 조회 중 오류가 발생했습니다.",
        };
      }
    },
  },

  getReservationInfo: {
    description: "고려대학교 도서관의 공간 예약 정보를 확인합니다. output: 예약시각, 입실만료시각, 이용마감시각, 건물, 장소, 좌석번호",
    parameters: z.object({}),
    execute: async () => {
      const url = "https://librsv.korea.ac.kr/user/my-status";
      const cookies = await getCookies("kdg");

      if (!cookies) {
        return { success: false, content: "Invalid userId" };
      }

      try {
        const response = await axios.get(url, {
          headers: { ...getHeaders(), Cookie: cookies },
        });
        console.log(response.data);

        const message = response.data?.message || "UNKNOWN";

        if (message === "SUCCESS") {
          const librarySeatResult = {
            예약시각: new Date(response.data?.data?.mySeat?.confirmTime).toLocaleString() || "UNKNOWN",
            입실만료시각: new Date(response.data?.data?.mySeat?.countDownTime).toLocaleString() || "UNKNOWN",
            이용마감시각: new Date(response.data?.data?.mySeat?.expireTime).toLocaleString() || "UNKNOWN",
            건물: response.data?.data?.mySeat?.seat?.group?.classGroup?.name || "UNKNOWN",
            장소: response.data?.data?.mySeat?.seat?.group?.name || "UNKNOWN",
            좌석번호: response.data?.data?.mySeat?.seat?.code || "UNKNOWN",
          };
          const studyRoomResult = {
            예약시각: new Date(response.data?.data?.myFacility?.[0]?.confirmTime).toLocaleString() || "UNKNOWN",
            입실만료시각: new Date(response.data?.data?.myFacility?.[0]?.countDownTime).toLocaleString() || "UNKNOWN",
            이용마감시각: new Date(response.data?.data?.myFacility?.[0]?.expireTime).toLocaleString() || "UNKNOWN",
            건물: response.data?.data?.myFacility?.[0]?.facCd?.group?.library?.name || "UNKNOWN",
            장소: response.data?.data?.myFacility?.[0]?.facCd?.name || "UNKNOWN",
            좌석번호: response.data?.data?.myFacility?.[0]?.facCd?.code || "UNKNOWN",
          };
          const result = {
            librarySeatResult,
            studyRoomResult,
          }
          console.log("성공")

          console.dir(result)

          return result;
        }
        else {
          return {
            success: false,
            message: "예약현황 조회 중 오류가 발생했습니다.",
          };
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.log(error)
          console.log(`Axios error: ${error.response?.status || "Unknown error"}`);
          return {
            success: false,
            message: "좌석 조회 중 오류가 발생했습니다.",
          };
        } else if (error instanceof Error) {
          console.log(`Error: ${error.message}`)

          return {
            success: false,
            message: "좌석 조회 중 오류가 발생했습니다.",
          };
        } else {
          console.log(`Internal Error: ${error.message}`)
          return { success: false, message: "좌석 조회 중 오류가 발생했습니다."};
        }
      }
    },
  },

  getAvailableSeatsOfStudyRooms: {
    description:
      "특정 날짜의 고려대학교의 모든 스터디룸의 정보와 현재 잔여 방 수를 확인합니다",
    parameters: z.object({
      date: z.string().regex(/^\d{8}$/, "YYYYMMDD 형식이어야 합니다."),
    }),
    execute: async ({ date }: { date: string }) => {
      const BUILDING_NAMES: Record<string, string> = {
        "33": "중앙광장 CCL",
        "1": "백주년기념관",
        "3": "과학도서관",
        "32": "하나스퀘어",
      };

      const FACILITY: Record<string, Facility[]> = {
        "중앙광장 CCL": [
          { code: 40, name: "B1 스튜디오" },
          { code: 53, name: "B1 편집실" },
          { code: 37, name: "B1 그룹룸" },
          { code: 38, name: "B1 Media Class RM" },
          { code: 39, name: "B1 Eventhall" },
        ],
        "백주년기념관": [
          { code: 2, name: "1층 C-Lounge 그룹스터디룸" },
          { code: 1, name: "1층 D-Lounge 그룹스터디룸" },
          { code: 43, name: "2층 프리젠테이션룸" },
          { code: 3, name: "2층 G-Lounge 스터디룸" },
          { code: 54, name: "2층 G-Lounge Carrel" },
          { code: 42, name: "2층 시어터" },
          { code: 6, name: "4층 그룹스터디룸" },
        ],
        "과학도서관": [
          { code: 46, name: "지하 1층 수면실" },
          { code: 47, name: "1층 Carrel (α Lounge)" },
          { code: 49, name: "1층 Carrel (!nfinity Lounge)" },
          { code: 48, name: "1층 !dea Room" },
          { code: 50, name: "3층 Carrel (Legacy Lounge)" },
          { code: 51, name: "3층 Project Play" },
        ],
        "하나스퀘어": [
          { code: 35, name: "B1 그룹스터디룸" },
          { code: 36, name: "B1 음악연습실" },
        ],
      };


      async function fetchStudyRoomStatus(date: string, roomCode: number) {
        try {
          // console.log(`Fetching status for room code: ${roomCode}, date: ${date}`);
          const response = await fetch(
            `https://librsv.korea.ac.kr/facilities/infos/groups/${date}/${roomCode}`
          );
          const data = await response.json();

          // console.log(`Response for room code ${roomCode}:`, JSON.stringify(data, null, 2));
          return data;
        } catch (error) {
          console.error(`시설 코드 ${roomCode}의 데이터 조회 실패:`, error);
          return null;
        }
      }

      const results: BuildingResult[] = [];

      for (const buildingName of Object.values(BUILDING_NAMES)) {
        console.log(`Processing building: ${buildingName}`);
        const facilitiesInBuilding = FACILITY[buildingName] || [];
        const buildingResult: BuildingResult = {
          buildingName,
          facilities: [],
          totalRooms: facilitiesInBuilding.length,
          availableRooms: 0,
        };

        for (const facility of facilitiesInBuilding) {
          // console.log(`Fetching status for facility: ${facility.name} (code: ${facility.code})`);
          const facilityStatus = await fetchStudyRoomStatus(date, facility.code);

          if (facilityStatus && Array.isArray(facilityStatus.data)) {
            facilityStatus.data.forEach((facilityData: any) => {
              const reservationLogs: StudyRoomLog[] = Array.isArray(facilityData.rsrvLog)
                ? facilityData.rsrvLog.map((log: any) => ({
                    rsrvStartTm: log.rsrvStartTm,
                    rsrvEndTm: log.rsrvEndTm,
                  }))
                : [];

              const isOccupied = reservationLogs.length > 0;

              buildingResult.facilities.push({
                facilityName: facilityData.name || facility.name,
                roomCode: facilityData.code || facility.code,
                availableSeats: facilityData.capacity?.max || null,
                totalSeats: facilityData.capacity?.max || null,
                startTm: facilityData.startTm || null,
                endTm: facilityData.endTm || null,
                reservationLogs,
                isOccupied,
              });

              if (!isOccupied) {
                buildingResult.availableRooms++;
              }
            });
          } else if (facilityStatus && facilityStatus.data) {
            console.warn(`Data is not an array for facility: ${facility.name}`);
            const facilityData = facilityStatus.data;

            const reservationLogs: StudyRoomLog[] = Array.isArray(facilityData.rsrvLog)
              ? facilityData.rsrvLog.map((log: any) => ({
                  rsrvStartTm: log.rsrvStartTm,
                  rsrvEndTm: log.rsrvEndTm,
                }))
              : [];

            const isOccupied = reservationLogs.length > 0;

            buildingResult.facilities.push({
              facilityName: facilityData.name || facility.name,
              roomCode: facilityData.code || facility.code,
              availableSeats: facilityData.capacity?.max || null,
              totalSeats: facilityData.capacity?.max || null,
              startTm: facilityData.startTm || null,
              endTm: facilityData.endTm || null,
              reservationLogs,
              isOccupied,
            });

            if (!isOccupied) {
              buildingResult.availableRooms++;
            }
          } else {
            console.warn(`No data for facility: ${facility.name}`);
            buildingResult.facilities.push({
              facilityName: facility.name,
              roomCode: facility.code,
              availableSeats: null,
              totalSeats: null,
              startTm: null,
              endTm: null,
              reservationLogs: [],
              isOccupied: false,
            });
            buildingResult.availableRooms++;
          }
        }

        results.push(buildingResult);
      }

      console.log("Final results:");
      console.dir(results, { depth: null });

      return results;
    },
  },
  reserveStudyRoom: {
    description: "2025년의 고려대학교의 특정 스터디룸을 예약합니다. 정확한 시설물이 나와야 합니다.",
    parameters: z.object({
      roomCode: z.number().describe("스터디룸의 코드"),
      roomName: z.string().describe("스터디룸의 이름"),
      regDate: z.string().regex(/^\d{8}$/, "YYYYMMDD 형식이어야 합니다."),
      regStartTime: z.string().describe("이용 시작 시각(HHmm). 12시 30분인 경우 1230"),
      regEndTime: z.string().describe("이용 종료 시각(HHmm). 14시 00분인 경우 1400"),
    }),
    execute: async ({
      roomCode,
      roomName,
      regDate,
      regStartTime,
      regEndTime,
    }: {
      roomCode: string;
      duration: number;
      roomName: string;
      regDate: string;
      regStartTime: string;
      regEndTime: string;
    }) => {
      const url = "https://librsv.korea.ac.kr/facilities/rsrvs/post";
      const cookies = await getCookies('kdg');

      if (!cookies) {
        return { success: false, content: "Invalid userId" };
      }

      try {
        const response = await axios.post(
          url,
          {
            facCode: roomCode,
            regDate: regDate,
            regStartTime: regStartTime,
            regEndTime: regEndTime,
            regReason: "테스트",
            regMemberList: [
                { "name": "이혁준", "id": "2021320027" },
                { "name": "김지성", "id": "2021130899" },
                { "name": "김수빈", "id": "2021220011" },
            ]},
          {
            headers: { ...getHeaders(), Cookie: cookies },
          }
        );

        const message = response.data?.message || "UNKNOWN";
        if (message === "SUCCESS") {
          return {
            success: true,
            message: `${roomName} 좌석이 ${regEndTime - regStartTime }분 동안 예약되었습니다.`,
          };
        }
        else {
          return {
            success: false,
            message: "좌석 예약 중 오류가 발생했습니다.",
          };
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.log(`Axios error: ${error.response?.status || "Unknown error"}, Error: ${error}`);
          return {
            success: false,
            message: "좌석 예약 중 오류가 발생했습니다.",
          };
        } else if (error instanceof Error) {
          console.log(`Error: ${error.message}`)

          return {
            success: false,
            message: "좌석 예약 중 오류가 발생했습니다.",
          };
        } else {
          return { success: false, message: "좌석 예약 중 오류가 발생했습니다."};
        }
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

// utils/slack.js
import axios from "axios";

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

// Fetch conversations history
export const fetchConversationHistory = async (channelId: string) => {
  try {
    const response = await axios.get(
      "https://slack.com/api/conversations.history",
      {
        headers: {
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        },
        params: {
          channel: channelId,
        },
      }
    );

    if (!response.data.ok) {
      throw new Error(response.data.error);
    }

    return response.data.messages;
  } catch (error) {
    console.error("Error fetching conversation history:", error);
    throw error;
  }
};

// Fetch user info by user ID
export const fetchUserInfo = async (userId: string) => {
  try {
    const response = await axios.get("https://slack.com/api/users.info", {
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      },
      params: {
        user: userId,
      },
    });

    if (!response.data.ok) {
      throw new Error(response.data.error);
    }

    return response.data.user;
  } catch (error) {
    console.error("Error fetching user info:", error);
    throw error;
  }
};

// Replace user IDs with user info
export const replaceUserIdsWithInfo = async (messages: any) => {
  const updatedMessages = await Promise.all(
    messages.map(async (message: any) => {
      if (message.user) {
        try {
          const userInfo = await fetchUserInfo(message.user);
          return {
            ...message,
            user: {
              id: userInfo.id,
              name: userInfo.name,
              realName: userInfo.real_name,
            },
          };
        } catch {
          return message; // Keep the original message if user lookup fails
        }
      }
      return message;
    })
  );

  return updatedMessages;
};

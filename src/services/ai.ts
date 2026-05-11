import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const getAIResponse = async (userMessage: string, history: { role: string; content: string }[] = []) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(h => ({ role: h.role, parts: [{ text: h.content }] })),
        { role: 'user', parts: [{ text: userMessage }] }
      ],
      config: {
        systemInstruction: `You are BusX Courier Support Assistant. 
        You help users with issues related to document delivery via buses.
        Our service:
        - Instant document delivery via public transport.
        - Real-time tracking available.
        - Roles: Customers (senders) and Drivers (bus staff).
        Help customers with tracking, booking, or general inquiries.
        Be polite, professional, and helpful. 
        Language: Use Bengali as the primary language as requested by the user, or English if needed.`,
      },
    });

    return response.text || "দুঃখিত, আমি এই মুহূর্তে উত্তর দিতে পারছি না।";
  } catch (error) {
    console.error("AI service error:", error);
    return "দুঃখিত, কোনো একটি সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।";
  }
};

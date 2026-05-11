import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function askAI(prompt: string, systemInstruction?: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "Ti je një asistent inteligjent për menaxhimin e bizneseve në gjuhën shqipe. Përgjigju shkurt, qartë dhe në mënyrë profesionale."
      }
    });
    return response.text;
  } catch (error) {
    console.error("AI Error:", error);
    return "Më vjen keq, ndodhi një gabim gjatë procesimit të kërkesës suaj.";
  }
}

export async function generateImageAI(prompt: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt
    });
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Image AI Error:", error);
  }
  return null;
}

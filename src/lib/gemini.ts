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
    return "Më vjen keq, nuk munda t'ju përgjigjem momentalisht.";
  }
}

export async function generateImageAI(prompt: string) {
  try {
    // Përdorim modelin e rekomanduar për gjenerim imazhesh
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image", 
      contents: {
        parts: [
          { text: `DETYRA: Gjenero një imazh profesional, fotorealist dhe me cilësi të lartë (HD) për këtë kërkesë biznesi: "${prompt}". Imazhi duhet të jetë i pastër, pa tekst apo vula (watermarks). Fokusohu te estetika e biznesit.` }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });
    
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    console.warn("AI ktheu përgjigje por pa imazh (inlineData):", response.text);
  } catch (error) {
    console.error("Image AI Error:", error);
  }
  return null;
}


import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from "@google/genai";

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });

  async generatePagePrompts(theme: string, childName: string) {
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Create 5 specific scene descriptions for a children's coloring book based on the theme: "${theme}". Each scene should be suitable for a child named ${childName}. Focus on simple subjects with thick lines.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              visualPrompt: { type: Type.STRING, description: "A detailed but simple prompt for image generation focusing on thick black outlines and white space." }
            },
            required: ["title", "visualPrompt"]
          }
        }
      }
    });

    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse AI response", e);
      return [];
    }
  }

  async generateColoringImage(prompt: string, resolution: string) {
    // Mapping resolution to a specific aspect ratio or standard Imagen config
    // In this environment, we use imagen-4.0-generate-001
    const basePrompt = "Children's coloring book page, heavy thick black outlines, stark white background, no shading, no gray, vector style, high contrast, minimalist detail, perfect for crayons. Subjects: ";
    
    const response = await this.ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: basePrompt + prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '3:4' // Portrait for books
      },
    });

    return `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;
  }

  async askChatbot(question: string) {
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: question,
      config: {
        systemInstruction: "You are a friendly, helpful AI assistant for a children's coloring book app. You love art and creativity. Keep answers short and kid-friendly."
      }
    });
    return response.text;
  }
}

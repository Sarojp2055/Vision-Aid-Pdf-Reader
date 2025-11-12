import { GoogleGenAI, Modality, LiveServerMessage, Blob } from "@google/genai";
import { ViewSettings } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // This is a fallback for development and should not appear in production
  // as the environment variable is expected to be set.
  console.warn("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const extractTextFromImage = async (base64Image: string, mimeType: string): Promise<string> => {
  try {
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType,
      },
    };

    const textPart = {
      text: 'Extract all text from this image. Present it clearly and readably.',
    };
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
    });

    return response.text;
  } catch (error) {
    console.error("Error extracting text using Gemini API:", error);
    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }
    return "An unknown error occurred while extracting text.";
  }
};


const buildEnhancementPrompt = (settings: ViewSettings): string => {
  const enhancements = [];
  if (settings.isInverted) {
    enhancements.push('invert the colors');
  }
  if (settings.isHighContrast) {
    enhancements.push('apply a high-contrast theme (e.g., black background with yellow or white text)');
  }
  if (settings.isGrayscale) {
    enhancements.push('convert to grayscale');
  }

  const enhancementString = enhancements.length > 0 ? enhancements.join(', ') : 'no visual changes';

  return `
    You are an AI specializing in assistive image technology. Your task is to process the given image to make its text **hyper-legible** for users with severe visual impairments.

    Follow these steps precisely:

    1.  **Apply Base Transformation**: First, apply these styles to the entire image: ${enhancementString}.

    2.  **Radical Text Overhaul**: This is the most critical step. You must aggressively enhance ONLY the text within the image.
        *   **Extreme Sharpening**: Do not just sharpen; make the edges of every character perfectly crisp and defined. Eliminate all anti-aliasing, feathering, or blur. The text should look like it was digitally rendered at the highest possible resolution.
        *   **Significant Bolding**: Increase the font weight substantially. The characters must be thick and solid, making them stand out.
        *   **Absolute Contrast**: Force the text color and its immediate background to be at maximum contrast (e.g., pure black on pure white, or pure yellow on pure black if high contrast is requested). Remove any gradients or noise around the letters.

    3.  **Strict Preservation**: You MUST NOT alter the original text content, font family (only its weight), layout, or any non-textual elements (like photos, borders, or diagrams). The goal is to enhance readability, not change the content.

    Return ONLY the final processed image as a direct response. Do not include any text, markdown, or explanations.
  `;
};

export const enhanceImage = async (base64Image: string, mimeType: string, settings: ViewSettings): Promise<string> => {
  try {
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType,
      },
    };

    const textPart = {
      text: buildEnhancementPrompt(settings),
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
      }
    }
    
    throw new Error("No image was returned from the AI.");

  } catch (error) {
    console.error("Error enhancing image using Gemini API:", error);
    if (error instanceof Error) {
      throw new Error(`AI Enhancement Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred during AI enhancement.");
  }
};


// --- Start of new code for Live API ---

// Audio Encoding & Decoding functions
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function createAudioBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}


export const connectToLiveSession = (callbacks: {
    onopen: () => void;
    onmessage: (message: LiveServerMessage) => void;
    onerror: (e: ErrorEvent) => void;
    onclose: (e: CloseEvent) => void;
}) => {
    // Re-create ai instance to ensure latest API key if it were to change.
    const aiInstance = new GoogleGenAI({ apiKey: API_KEY });
    return aiInstance.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: 'You are a friendly and helpful assistant for the Vision Aid application. Keep your responses concise and clear.',
        },
    });
};
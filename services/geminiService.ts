
import { GoogleGenAI, Chat } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { FileData } from "../types";

let chatSession: Chat | null = null;

// Initialize the API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using Gemini 2.0 Flash Thinking Experimental
// This model is FREE (in preview), supports High Output (64k tokens), and Deep Reasoning.
export const initializeChat = (modelName: string = "gemini-2.0-flash-thinking-exp-01-21") => {
  try {
    chatSession = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        topK: 40,
        maxOutputTokens: 65536,
        thinkingConfig: { thinkingBudget: 10240 } 
      },
    });
    return chatSession;
  } catch (error) {
    console.error("Failed to initialize chat:", error);
    throw error;
  }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to convert Base64 back to Blob for upload
const base64ToBlob = async (base64Data: string, contentType: string) => {
    const response = await fetch(`data:${contentType};base64,${base64Data}`);
    return await response.blob();
};

/**
 * Helper to upload file to Gemini File API if it is large.
 */
const uploadToGemini = async (file: FileData) => {
    console.log(`Uploading large file to Gemini: ${file.name}`);
    const blob = await base64ToBlob(file.data, file.mimeType);
    
    const uploadResult = await ai.files.upload({
        file: blob,
        config: { mimeType: file.mimeType, displayName: file.name }
    });
    
    // ROBUSTNESS FIX: Handle different SDK response structures
    // Sometimes response is { file: { uri: ... } }, sometimes it might be the file object directly
    const fileMetadata = uploadResult.file || uploadResult;

    if (!fileMetadata || !fileMetadata.uri) {
        console.error("Invalid Upload Result:", uploadResult);
        throw new Error("Gemini File API upload returned invalid metadata (missing URI).");
    }
    
    console.log(`Upload complete. URI: ${fileMetadata.uri}`);
    return fileMetadata;
};

/**
 * Sends a message and yields chunks of text as they arrive (Streaming).
 * Includes retry logic for transient errors.
 */
export async function* streamMessage(
  message: string,
  files: FileData[] = []
): AsyncGenerator<string, void, unknown> {
  if (!chatSession) {
    initializeChat();
  }

  if (!chatSession) {
    throw new Error("Chat session could not be initialized.");
  }

  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      // Construct the message parts
      const parts: any[] = [];

      // Process files: Decide between Inline (Base64) or Upload (File URI)
      if (files && files.length > 0) {
        for (const file of files) {
             // Calculate rough size in MB (base64 length * 0.75 / 1024 / 1024)
             const sizeMB = (file.data.length * 0.75) / (1024 * 1024);
             
             // Threshold: 9MB. Safely below the ~20MB inline limit.
             // If larger, we upload it via File API to bypass payload limits.
             if (sizeMB > 9) {
                 try {
                    const fileMetadata = await uploadToGemini(file);
                    parts.push({
                        fileData: {
                            mimeType: fileMetadata.mimeType,
                            fileUri: fileMetadata.uri
                        }
                    });
                 } catch (uploadError) {
                     console.error("Failed to upload large file:", uploadError);
                     
                     // Only fallback to inline if the file is borderline size (< 18MB).
                     // If it's huge (> 18MB), inline WILL fail with 400 error, so better to throw the upload error.
                     if (sizeMB < 18) {
                         console.warn("Falling back to inline data (might succeed for smaller files)...");
                         parts.push({
                            inlineData: {
                              mimeType: file.mimeType,
                              data: file.data,
                            },
                         });
                     } else {
                         throw new Error(`File upload failed and file is too large for inline fallback (${sizeMB.toFixed(1)}MB). API Error: ${uploadError instanceof Error ? uploadError.message : 'Unknown Error'}`);
                     }
                 }
             } else {
                 // Small file: Use Inline Data (Faster)
                 parts.push({
                    inlineData: {
                      mimeType: file.mimeType,
                      data: file.data,
                    },
                 });
             }
        }
      }

      parts.push({ text: message });

      // Use sendMessageStream
      const result = await chatSession.sendMessageStream({
        message: parts, // correctly passing array of parts
      });

      // Yield chunks as they come in
      for await (const chunk of result) {
          const chunkText = chunk.text;
          if (chunkText) {
              yield chunkText;
          }
      }
      
      // If successful, exit the loop
      return;

    } catch (error: any) {
      attempt++;
      console.error(`Gemini API Attempt ${attempt} failed:`, error);
      
      // Check for specific error types to decide on retry
      const isNetworkError = error.message?.includes("http status code: 0") || (error.status && error.status === 'UNKNOWN');
      const isServerError = error.message?.includes("503") || error.message?.includes("500") || error.message?.includes("429");
      
      if ((isNetworkError || isServerError) && attempt < maxAttempts) {
        console.warn(`Retrying request in ${attempt}s due to error...`);
        await delay(1000 * attempt); // Exponential backoff
        continue;
      }

      // If we are here, we are either out of attempts or it's a non-retryable error
      let friendlyError = "An unexpected error occurred.";
      
      // Extract useful error message
      if (error.message) {
          if (error.message.includes("token count exceeds")) {
               friendlyError = "Token Limit Exceeded: The content is too large. Please start a new chat.";
          } else if (error.message.includes("Document size exceeds")) {
               friendlyError = "File Too Large: The document exceeds the API's inline limit. (Upload failed)";
          } else if (error.message.includes("SAFETY")) {
               friendlyError = "Safety Filter Triggered: The content was flagged by safety settings.";
          } else if (error.message.includes("http status code: 0")) {
              friendlyError = "Network Connection Error: Could not reach Gemini API. Please check your internet connection.";
          } else if (error.message.includes("413")) {
              friendlyError = "Payload Too Large: The file is too big for the direct API. Please try compressing it.";
          } else if (error.message.includes("429")) {
              friendlyError = "Free Tier Limit Reached: You are sending too many requests too quickly. Please wait a moment.";
          } else {
               friendlyError = `API Error: ${error.message}`;
          }
      } else if (error.statusText) {
          friendlyError = `API Error: ${error.statusText}`;
      }

      throw new Error(friendlyError);
    }
  }
}

export const resetSession = () => {
  chatSession = null;
};

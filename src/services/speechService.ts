import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "../api/client";

export interface SpeechData {
  id: string;
  phrase: string;
  audio_url: string;
}

export async function generateSpeech(text: string) {
  const token = await AsyncStorage.getItem("slivi_token");

  return apiRequest<SpeechData>("slivi/speech/generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
}
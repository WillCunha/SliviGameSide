import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "../api/client";

type GamePayload = {
  game: string;
  score: number;
  duration: number;
  finalEmotionValue: number;
  finalEmotionState: string;
  stats: Record<string, any>;
};

/**
 * POST → slivi/game
 * Envia o score e os dados da partida
 */
export async function sendGameScore(data: GamePayload) {
  const token = await AsyncStorage.getItem("slivi_token");

  return apiRequest<any>("slivi/game", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
}

/**
 * GET → slivi/objectives/:game
 * Busca os objetivos de um jogo específico
 */
export async function getObjectives(game: string) {
  const token = await AsyncStorage.getItem("slivi_token");

  return apiRequest<any>(`slivi/objectives/${game}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
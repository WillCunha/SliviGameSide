import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "../api/client";

export interface FeedResponse {
  success: boolean;
  total_hunger_restored: number;
  total_xp_gained: number;
  combo_word: string | null;
  sick_message: number | string | null;
}

// Correção: mudamos de 'foodId: array' para 'foodIds: number[]'
export async function feedSlivi(foodIds: number[]) {
  const token = await AsyncStorage.getItem("slivi_token");

  return apiRequest<FeedResponse>("slivi/action", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: "FEED",
      food_ids: foodIds, // Aqui vai o array completo: [id, id, id]
    }),
  });
}
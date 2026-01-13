// services/FoodService.ts

import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "../api/client";

export async function feedSlivi(foodId: number) {
  const token = await AsyncStorage.getItem("token");

  

  return apiRequest<any[]>("slivi/action", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: "FEED",
      foodId: foodId,
    }),
  });
}

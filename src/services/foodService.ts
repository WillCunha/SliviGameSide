import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "../api/client";

export async function fetchFoods() {
  const token = await AsyncStorage.getItem("slivi_token");

  return apiRequest<any[]>("slivi/fridge", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

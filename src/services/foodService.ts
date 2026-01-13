import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "../api/client";

export async function fetchFoods() {
  const token = await AsyncStorage.getItem("token");

  return apiRequest<any[]>("slivi/foods", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

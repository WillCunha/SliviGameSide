import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "../api/client";

export async function fetchClothes() {
  const token = await AsyncStorage.getItem("slivi_token");

  return apiRequest<any[]>("slivi/wardrobe", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

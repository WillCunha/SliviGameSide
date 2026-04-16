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

// NOVO: Busca os itens disponíveis na loja de roupas
export async function fetchStoreClothes() {
  const token = await AsyncStorage.getItem("slivi_token");
  
  return apiRequest<any>("slivi/store/clothes", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function buyStoreCloth(clothId: number) {
  const token = await AsyncStorage.getItem("slivi_token");
  
  return apiRequest<any>("slivi/store/buy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ cloth_id: clothId }),
  });
}

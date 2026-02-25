// src/services/dressService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "../api/client";

export async function dressService(slug: string, action: 'EQUIP' | 'REMOVE') {
  const token = await AsyncStorage.getItem("slivi_token");

  return apiRequest<any>("slivi/wardrobe/equip", { // URL correta do seu index.php
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      slug: slug,
      action: action, // Aqui passamos a decisão
    }),
  });
}
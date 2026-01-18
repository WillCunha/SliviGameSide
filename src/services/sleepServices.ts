// services/sleepServices.ts

import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "../api/client";

/**
 * Função auxiliar interna para enviar a ação de sono.
 * Aceita apenas 'sleep' ou 'wake' para evitar erros de digitação.
 */
async function sendSleepAction(actionType: 'sleep' | 'wake') {
  const token = await AsyncStorage.getItem("token");

  return apiRequest<any>("slivi/action", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: actionType
    }),
  });
}

// --- FUNÇÕES EXPORTADAS PARA USO NA HOME ---

/**
 * Envia o comando para o personagem dormir
 * Payload: { "action": "sleep" }
 */
export async function sleepSlivi() {
  return sendSleepAction('sleep');
}

/**
 * Envia o comando para o personagem acordar
 * Payload: { "action": "wake" }
 */
export async function wakeSlivi() {
  return sendSleepAction('wake');
}
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://api.wfsoft.com.br/slivi-game/api';

// Função simples para extrair os dados do JWT (o ID do usuário costuma vir no campo "sub")
function decodeJWT(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export async function login(email: string, password: string) {
  // Mantemos o seu fetch original! Sem alterar client.ts
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error);
  }
  
  // O token vem dentro de data.data.token
  const token = data.data.token;

  // Decodifica o token para pegar o ID do usuário
  const decoded = decodeJWT(token);
  const userId = decoded?.sub || 1; // Extrai o ID do token ou usa 1 como segurança

  // Salvamos ambos no AsyncStorage (usando as chaves slivi_ para padronizar)
  await AsyncStorage.setItem('slivi_token', token);
  await AsyncStorage.setItem('slivi_userId', String(userId));

  // Retornamos o token e o userId para a tela de Login
  return { token, userId };
}
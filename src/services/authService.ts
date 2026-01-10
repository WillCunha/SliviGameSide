import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://api.wfsoft.com.br/slivi-game/api';

export async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error);
  }
  
  await AsyncStorage.setItem('token', data.data.token);
  return data;
}

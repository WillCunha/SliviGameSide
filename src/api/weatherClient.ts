import * as Location from 'expo-location';

// Ajuste a URL para o seu servidor
const API_URL = 'https://api.wfsoft.com.br/slivi-game/api/location/sync'; 

export type WeatherState = {
  condition: 'sun' | 'rain' | 'cloudy' | 'night';
  temp: number;
  is_day: boolean;
};

export async function syncUserLocation(userId: number): Promise<WeatherState | null> {
  try {
    // 1. Pedir Permissão
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('Permissão de localização negada');
      return null; // Retorna nulo para usar o fallback (Sol)
    }

    // 2. Pegar Coordenadas
    const location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;

    // 3. Enviar para o servidor
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        latitude: latitude,
        longitude: longitude
      })
    });

    const json = await response.json();

    if (json.success) {
      return json.data.weather; // Retorna o objeto { temp, condition, is_day }
    } else {
      console.error('Erro na API:', json.error);
      return null;
    }

  } catch (error) {
    console.error('Erro no serviço de localização:', error);
    return null;
  }
}
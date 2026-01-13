import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../api/client';
import { SliviState } from '../types/slivi';


export async function fetchSliviState() {

  const token = await AsyncStorage.getItem("token");


  return apiRequest<SliviState>('slivi/state', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
}

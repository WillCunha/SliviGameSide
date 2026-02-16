import { apiRequest } from '../api/client';
import { SliviState } from '../types/slivi';


export async function fetchSliviState(token) {




  return apiRequest<SliviState>('slivi/state', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

}

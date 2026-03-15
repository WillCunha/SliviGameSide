const API_URL = 'https://api.wfsoft.com.br/slivi-game/api/';

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiError = {
  success: false;
  error: string;
};

type ApiResponse<T> = ApiSuccess<T> | ApiError;

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(API_URL + endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const json: ApiResponse<T> = await response.json();

  if (!json.success) {
    throw new Error(json.error);
  }
  

  return json.data;
}

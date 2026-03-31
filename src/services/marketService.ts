import { apiRequest } from '../api/client';

export interface MarketFood {
    id: number;
    name: string;
    image_key: string;
    type: string;
    tasty: string;
    hunger: number;
    energy: number;
    happiness: number;
    temperature: number;
    price: number;
}

export async function fetchMarketFoods(token: string) {
    return apiRequest<MarketFood[]>('slivi/market/foods', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
    });
}

// Atualizado para receber um array de itens
export async function buyMarketItems(token: string, items: { food_id: number; quantity: number }[]) {
    return apiRequest<any>('slivi/market/buy', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items }),
    });
}
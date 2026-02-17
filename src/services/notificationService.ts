import { apiRequest } from '../api/client';

export type SliviNotification = {
    id: number;
    type: string; 
    title: string;
    message: string;
    created_at: string;
    is_read: number;
};

export async function fetchNotifications(token) {
    return apiRequest<SliviNotification[]>('slivi/notifications', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}
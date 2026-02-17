import { SliviNotification } from '@/src/services/notificationService';
import { Ionicons } from '@expo/vector-icons';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

type Props = {
    visible: boolean;
    onClose: () => void;
    notifications: SliviNotification[];
    loading?: boolean;
};

// Mapeamento de ícones por tipo de notificação
const ICON_MAP: Record<string, string> = {
    HUNGER_LOW: 'fast-food',
    ENERGY_LOW: 'moon',
    BORED: 'game-controller',
    COLD: 'snow',
    RAIN: 'rainy',
    HOT: 'sunny',
    DEFAULT: 'notifications',
};

const formatDate = (dateString: string) => {
    try {
        const date = new Date(dateString);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')} às ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch (e) {
        return dateString;
    }
};

export default function Notification({ visible, onClose, notifications, loading }: Props) {
    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>Notificações</Text>

                    {loading ? (
                        <Text style={styles.emptyText}>Carregando...</Text>
                    ) : notifications.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-off-outline" size={40} color="#666" />
                            <Text style={styles.emptyText}>Nenhuma notificação recente.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={notifications}
                            keyExtractor={(item) => item.id.toString()}
                            contentContainerStyle={styles.listContent}
                            renderItem={({ item }) => {
                                const iconName = ICON_MAP[item.type] || ICON_MAP.DEFAULT;
                                return (
                                    <View style={styles.card}>
                                        <View style={styles.iconContainer}>
                                            <Ionicons name={iconName as any} size={24} color="#FFF" />
                                        </View>
                                        <View style={styles.textContainer}>
                                            <Text style={styles.cardTitle}>{item.title}</Text>
                                            <Text style={styles.cardMessage}>{item.message}</Text>
                                            <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
                                        </View>
                                        {!item.is_read && <View style={styles.unreadDot} />}
                                    </View>
                                );
                            }}
                        />
                    )}

                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Text style={styles.closeText}>Fechar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#1c1c1c',
        padding: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "80%", // Ocupa até 80% da tela
        height: '70%',    // Altura fixa para garantir que a lista role
    },
    title: {
        fontSize: 20,
        color: "#fff",
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    listContent: {
        paddingBottom: 20,
    },
    card: {
        backgroundColor: '#2c2c2c',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#444',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    cardTitle: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 2,
    },
    cardMessage: {
        color: '#ccc',
        fontSize: 12,
        marginBottom: 4,
    },
    cardDate: {
        color: '#666',
        fontSize: 10,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF9800', // Laranja para destacar
        marginLeft: 8,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    emptyText: {
        color: '#666',
        marginTop: 10,
        textAlign: 'center',
    },
    closeBtn: {
        backgroundColor: "#FF9800",
        marginTop: 10,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: "center",
    },
    closeText: {
        fontWeight: "bold",
        color: "#000",
    },
});
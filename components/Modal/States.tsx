import { Ionicons } from '@expo/vector-icons';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

type States = {
    HUNGER: number;
    ENERGY: number;
    SLEEP: number;
    TEMPERATURE: number;
    FUN: number;
};

type Emotion = {
    Emotion: any;
}

type Props = {
    visible: boolean;
    onClose: () => void;
    states: States;
    emotion: Emotion;
};

const CONFIG = {
    HUNGER: { label: 'Fome', icon: 'fast-food' },
    ENERGY: { label: 'Energia', icon: 'flash' },
    SLEEP: { label: 'Sono', icon: 'moon' },
    TEMPERATURE: { label: 'Temperatura', icon: 'thermometer' },
    FUN: { label: 'Diversão', icon: 'happy' },
    BRAVO: { label: 'Bravo', icon: 'sad' },
};



export default function StatesModal({ visible, onClose, states, emotion }: Props) {
    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Condição</Text>
                        <Text style={styles.subtitle}>Emoção Atual: {emotion}</Text>
                    </View>
                    {Object.entries(states).map(([key, value]) => {
                        const cfg = CONFIG[key as keyof States];

                        return (
                            <View key={key} style={styles.item}>
                                <View style={styles.row}>
                                    <Ionicons name={cfg.icon as any} size={22} color={"#fff"} />
                                    <Text style={styles.label}>{cfg.label}</Text>
                                    <Text style={styles.value}>{value}%</Text>
                                </View>

                                <View style={styles.barBg}>
                                    <View style={[styles.barFill, { width: `${value}%` }]} />
                                </View>
                            </View>
                        );
                    })}

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
        maxHeight: "85%",
    },
    header: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '5%',
        width: '100%',
    },
    title: {
        fontSize: 20,
        color: "#fff",
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'left',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    subtitle: {
        fontSize: 14,
        color: "#fff",
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'right',
        textTransform: 'capitalize'
    },
    item: {
        marginBottom: 14,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        flex: 1,
        marginLeft: 8,
        color: "#fff",
    },
    value: {
        fontWeight: 'bold',
        color: "#fff",
    },
    barBg: {
        height: 8,
        backgroundColor: '#E5E5E5',
        borderRadius: 4,
        marginTop: 6,
        overflow: 'hidden',
    },
    barFill: {
        height: 8,
        backgroundColor: '#4CAF50',
    },
    closeBtn: {
        backgroundColor: "#FF9800",
        marginTop: 16,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: "center",
    },
    closeText: {
        fontWeight: "bold",
        color: "#000",
    },
});

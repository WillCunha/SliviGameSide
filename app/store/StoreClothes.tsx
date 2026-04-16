import { useBackToLoading } from '@/components/useBackToLoading';
import { CLOTHES_IMAGES } from '@/src/components/clothes/clothesMap';
import { buyStoreCloth, fetchStoreClothes } from '@/src/services/clothesService';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export interface ClothItem {
    id: number;
    name: string;
    slug: string;
    temperature: number;
    category: string;
    classe: string;
    price: number;
    min_level: number;
    owned: boolean;
    unlocked: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Ícones e labels para as abas do topo
const CATEGORY_INFO: Record<string, { label: string }> = {
    ÓCULOS: { label: '👓 Óculos' },
    JAQUETAS: { label: '🧥 Jaquetas' },
    CALÇAS: { label: '👖 Calças' }, // Ícone aproximado para calças/pernas
    SHORTS: { label: '🩳 Shorts' }, // Ícone aproximado para calças/pernas
    CAMISAS: { label: '👕 Camisas' },
    SUITS: { label: '👔 Ternos' },
};

const CLASS_COLORS: Record<string, string> = {
    normal: '#E0E0E0',
    bronze: '#CD7F32',
    prata: '#C0C0C0',
    gold: '#FFD700',
    premium: '#9B59B6',
};

export default function StoreClothesScreen() {
    const { handleBack } = useBackToLoading();

    const params = useLocalSearchParams();
    const [groupedClothes, setGroupedClothes] = useState<Record<string, ClothItem[]>>({});
    const [loading, setLoading] = useState(true);
    const [buyingId, setBuyingId] = useState<number | null>(null);
    const [money, setMoney] = useState(Number(params.money) || 0);

    // Controle das Abas (Tabs)
    const [activeTab, setActiveTab] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const categories = Object.keys(groupedClothes);

    useEffect(() => {
        loadStore();
    }, []);

    const loadStore = async () => {
        try {
            const data = await fetchStoreClothes();
            if (data && data.success && data.data) {
                setGroupedClothes(data.data);
            } else {
                setGroupedClothes(data);
            }
        } catch (error) {
            Alert.alert("Erro", "Não foi possível carregar a vitrine da loja.");
        } finally {
            setLoading(false);
        }
    };

    const handleTabPress = (index: number) => {
        setActiveTab(index);
        flatListRef.current?.scrollToIndex({ index, animated: true });
    };

    const handleMomentumScrollEnd = (event: any) => {
        const newIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        if (newIndex !== activeTab) {
            setActiveTab(newIndex);
        }
    };

    const formatMoney = (value: number) => {
        return (value / 100)
            .toFixed(2)
            .replace('.', ',')
            .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    };

    const handleBuyItem = async (item: ClothItem) => {
        if (money < item.price) {
            Alert.alert("Aviso", "Você não tem moedas suficientes para esta peça.");
            return;
        }

        Alert.alert(
            "Confirmar Compra",
            `Deseja comprar ${item.name} por ${formatMoney(item.price)} S-Coins?`,
            [
                { text: "Cancelar", style: "cancel" },
                { text: "Comprar", onPress: () => processPurchase(item.id, item.price) }
            ]
        );
    };

    const processPurchase = async (id: number, price: number) => {
        setBuyingId(id);
        try {
            await buyStoreCloth(id);
            Alert.alert("Sucesso!", "Nova peça adicionada ao seu guarda-roupa!");

            setMoney(prev => prev - price);
            setGroupedClothes(prevGroups => {
                const newGroups = { ...prevGroups };
                for (const category in newGroups) {
                    newGroups[category] = newGroups[category].map(cloth =>
                        cloth.id === id ? { ...cloth, owned: true } : cloth
                    );
                }
                return newGroups;
            });
        } catch (error: any) {
            Alert.alert("Ops!", error.message || "Ocorreu um erro ao processar a compra.");
        } finally {
            setBuyingId(null);
        }
    };



    const renderClothCard = (item: ClothItem) => {
        const imageSource = CLOTHES_IMAGES[item.slug as keyof typeof CLOTHES_IMAGES];
        const classColor = CLASS_COLORS[item.classe] || CLASS_COLORS.normal;
        const canAfford = money >= item.price;

        return (
            <View key={item.id} style={[styles.card, { borderColor: classColor }]}>
                <View style={[styles.badge, { backgroundColor: classColor }]}>
                    <Text style={styles.badgeText}>{item.classe.toUpperCase()}</Text>
                </View>

                {imageSource ? (
                    <Image source={imageSource} style={styles.clothImage} resizeMode="contain" />
                ) : (
                    <View style={styles.placeholderImage}>
                        <Ionicons name="shirt-outline" size={40} color="#ccc" />
                    </View>
                )}

                <Text style={styles.clothName} numberOfLines={2}>{item.name}</Text>

                <View style={styles.infoContainer}>
                    <Ionicons name="thermometer-outline" size={14} color="#666" />
                    <Text style={styles.temperatureText}>+{item.temperature}</Text>
                </View>

                {item.owned ? (
                    <View style={[styles.actionButton, styles.ownedButton]}>
                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Adquirido</Text>
                    </View>
                ) : !item.unlocked ? (
                    <View style={[styles.actionButton, styles.lockedButton]}>
                        <Ionicons name="lock-closed" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Nível {item.min_level}</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            canAfford ? styles.buyButton : styles.unaffordableButton // <--- Lógica do botão vermelho aqui!
                        ]}
                        onPress={() => handleBuyItem(item)}
                        disabled={buyingId === item.id}
                    >
                        {buyingId === item.id ? (
                            <ActivityIndicator color="#000" size="small" />
                        ) : (
                            <Text style={[
                                styles.buyButtonText,
                                !canAfford && { color: '#fff' } // Texto branco se o botão for vermelho
                            ]}>
                                🪙 {formatMoney(item.price)}
                            </Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Boutique Slivi</Text>
                <View style={styles.moneyContainer}>
                    <Text style={styles.headerMoney}>🪙 {formatMoney(money)}</Text>
                </View>
            </View>

            {/* Top Menu Categories */}
            <View style={styles.tabsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                    {categories.map((category, index) => {
                        const isActive = activeTab === index;
                        const info = CATEGORY_INFO[category] || { label: category, icon: 'shirt' };
                        return (
                            <TouchableOpacity
                                key={category}
                                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                                onPress={() => handleTabPress(index)}
                            >
                                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                                    {info.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Swipeable Pages */}
            <FlatList
                ref={flatListRef}
                data={categories}
                keyExtractor={(item) => item}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                renderItem={({ item: category }) => (
                    <View style={styles.pageContainer}>
                        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                            <View style={styles.row}>
                                {groupedClothes[category].map(item => renderClothCard(item))}
                            </View>
                        </ScrollView>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9F6F0' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F6F0' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20,
        backgroundColor: '#fff', borderBottomWidth: 2, borderColor: '#000',
    },
    backButton: { padding: 5, marginLeft: -5 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#000', fontFamily: 'monospace' },
    moneyContainer: { backgroundColor: '#EBE3CD', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 15, borderWidth: 2, borderColor: '#000' },
    headerMoney: { fontSize: 16, fontWeight: '900', color: '#000' },

    // Estilos do Menu de Abas
    tabsContainer: { backgroundColor: '#fff', borderBottomWidth: 2, borderColor: '#ddd' },
    tabsScroll: { paddingHorizontal: 15, paddingVertical: 12, alignItems: 'center' },
    tabButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 10 },
    tabButtonActive: { backgroundColor: '#000' },
    tabText: { fontSize: 14, fontWeight: 'bold', color: '#666' },
    tabTextActive: { color: '#fff' },

    // Estilos da Página e Cards
    pageContainer: { width: SCREEN_WIDTH },
    listContent: { padding: 15, paddingBottom: 40 },
    row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

    card: {
        backgroundColor: '#fff', borderWidth: 3, borderRadius: 12,
        padding: 12, marginBottom: 15, width: '48%', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    },
    badge: { position: 'absolute', top: -10, right: -10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 2, borderColor: '#000', zIndex: 1 },
    badgeText: { fontSize: 10, fontWeight: 'bold', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 1 },

    clothImage: { width: 200, height: 200, marginVertical: 10 },
    placeholderImage: { width: 150, height: 150, marginVertical: 10, backgroundColor: '#f0f0f0', borderRadius: 45, justifyContent: 'center', alignItems: 'center' },

    clothName: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 5, minHeight: 38 },
    infoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    temperatureText: { fontSize: 12, color: '#666', fontWeight: 'bold', marginLeft: 4 },

    actionButton: { width: '100%', paddingVertical: 8, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000' },
    actionButtonText: { fontSize: 13, fontWeight: 'bold', color: '#fff', marginLeft: 5 },

    ownedButton: { backgroundColor: '#4CAF50', borderColor: '#2E7D32' },
    lockedButton: { backgroundColor: '#757575', borderColor: '#424242' },

    // Botão Amarelo (Pode Comprar) e Vermelho (Não Pode Comprar)
    buyButton: { backgroundColor: '#FFD700' },
    unaffordableButton: { backgroundColor: '#FF4A4A', borderColor: '#990000' },
    buyButtonText: { fontSize: 15, fontWeight: '900', color: '#000' },
});
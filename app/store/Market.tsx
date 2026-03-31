import { FOOD_IMAGES } from '@/src/components/foods/foodMap';
import { buyMarketItems, fetchMarketFoods, MarketFood } from '@/src/services/marketService';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';


export default function MarketScreen() {

    const params = useLocalSearchParams();
    const [foods, setFoods] = useState<MarketFood[]>([]);
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState(false);
    const [money, setMoney] = useState(Number(params.money));

    // Estado do carrinho: { food_id: quantidade }
    const [cart, setCart] = useState<Record<number, number>>({});

    useEffect(() => {
        loadMarket();
    }, []);

    const loadMarket = async () => {
        try {
            const token = await AsyncStorage.getItem('slivi_token');
            if (!token) throw new Error("Usuário não autenticado");

            const data = await fetchMarketFoods(token);
            setFoods(data);
        } catch (error) {
            Alert.alert("Erro", "Não foi possível carregar os produtos do mercado.");
        } finally {
            setLoading(false);
        }
    };

    // Função para atualizar quantidade pelos botões + e -
    const updateQuantity = (id: number, delta: number) => {
        setCart(prev => {
            const currentQty = prev[id] || 0;
            const nextQty = Math.max(0, currentQty + delta);

            const newCart = { ...prev };
            if (nextQty === 0) {
                delete newCart[id]; // Remove do carrinho se for 0
            } else {
                newCart[id] = nextQty;
            }
            return newCart;
        });
    };

    // Função para atualizar quantidade via digitação
    const handleTextChange = (id: number, text: string) => {
        const val = parseInt(text.replace(/[^0-9]/g, ''), 10);
        setCart(prev => {
            const newCart = { ...prev };
            if (isNaN(val) || val <= 0) {
                delete newCart[id];
            } else {
                newCart[id] = val;
            }
            return newCart;
        });
    };

    const handleCheckout = async () => {
        const itemsToBuy = Object.entries(cart).map(([id, quantity]) => ({
            food_id: Number(id),
            quantity
        }));

        if (itemsToBuy.length === 0) return;

        setBuying(true);
        try {
            const token = await AsyncStorage.getItem('slivi_token');
            if (!token) {
                Alert.alert("Erro", "Sessão expirada. Faça login novamente.");
                return;
            }

            // Faz a chamada para a API
            const response = await buyMarketItems(token, itemsToBuy);

            // Se chegou aqui, success foi true (conforme lógica do seu client.ts)
            Alert.alert(
                "Sucesso",
                response.message || "Compra realizada com sucesso!",
                [
                    {
                        text: "OK",
                        onPress: () => router.replace('/home') // Redireciona para a Home
                    }
                ]
            );

            setCart({}); // Limpa o carrinho local

        } catch (error: any) {
            // Se success foi false, o erro lançado no client.ts cai aqui
            // O error.message conterá o texto vindo do backend (ex: "Saldo insuficiente de S-Coins.")
            Alert.alert("Ops!", error.message || "Ocorreu um erro ao processar a compra.");
        } finally {
            setBuying(false);
        }
    };
    // Cálculos para o painel de checkout
    const totalItems = Object.values(cart).reduce((acc, qty) => acc + qty, 0);
    const totalPrice = Object.entries(cart).reduce((acc, [id, qty]) => {
        const food = foods.find(f => f.id === Number(id));
        return acc + (food ? food.price * qty : 0);
    }, 0);

    const formatMoney = (value: number) => {
        return (value / 100)
            .toFixed(2) // Garante 2 casas decimais
            .replace('.', ',') // Troca o ponto da casa decimal por vírgula
            .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.'); // Adiciona os pontos de milhar
    };

    const renderFoodItem = ({ item }: { item: MarketFood }) => {
        console.log("items: " + JSON.stringify(item));
        const imageSource = FOOD_IMAGES[item.image_key]?.[0];
        const qty = cart[item.id] || 0;
        const totalItemPrice = qty > 0 ? qty * item.price : item.price;

        return (
            <View style={styles.card}>


                <StatusBar style="dark" />

                <Image source={imageSource} style={styles.foodImage} resizeMode="contain" />
                <Text style={styles.foodName}>{item.name}</Text>

                {/* Preços */}
                <View style={styles.priceContainer}>
                    <Text style={styles.unitPrice}>Unid: 🪙 {formatMoney(item.price)}</Text>
                    {qty > 0 && (
                        <Text style={styles.totalItemPrice}>Total: 🪙 {formatMoney(totalItemPrice)}</Text>
                    )}
                </View>

                {/* Controle de Quantidade */}
                <View style={styles.quantityContainer}>
                    <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(item.id, -1)}
                    >
                        <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>

                    <TextInput
                        style={styles.qtyInput}
                        keyboardType="numeric"
                        value={qty > 0 ? qty.toString() : ''}
                        placeholder="0"
                        placeholderTextColor="#aaa"
                        onChangeText={(text) => handleTextChange(item.id, text)}
                    />

                    <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(item.id, 1)}
                    >
                        <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                </View>
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
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Supermercado</Text>
                <Text style={styles.headerMoney}>{formatMoney(money)}</Text>
            </View>

            <FlatList
                data={foods}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                contentContainerStyle={[styles.listContent, totalItems > 0 && { paddingBottom: 100 }]} // Espaço para a barra inferior
                columnWrapperStyle={styles.row}
                renderItem={renderFoodItem}
                showsVerticalScrollIndicator={false}
            />

            {/* Barra Inferior Flutuante (Checkout) */}
            {totalItems > 0 && (
                <View style={styles.checkoutBar}>
                    <View>
                        <Text style={styles.checkoutTotalItems}>{totalItems} itens na cesta</Text>
                        <Text style={[
                            styles.checkoutTotalPrice,
                            totalPrice > money && { color: '#FF4A4A' } // Se o total for maior que o saldo, fica vermelho
                        ]}>Total: 🪙 {formatMoney(totalPrice)}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.checkoutBtn}
                        onPress={handleCheckout}
                        disabled={buying}
                    >
                        {buying ? (
                            <ActivityIndicator color="#000" size="small" />
                        ) : (
                            <Text style={styles.checkoutBtnText}>Comprar</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#EBE3CD' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EBE3CD' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 50, paddingBottom: 20, paddingHorizontal: 5,
        backgroundColor: '#fff', borderBottomWidth: 2, borderColor: '#000', width: '100%',
    },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#000', textTransform: 'uppercase', },
    headerMoney: { fontSize: 20, fontWeight: '900', color: '#000', textTransform: 'uppercase', marginRight: '-10%' },
    listContent: { padding: 10 },
    row: { justifyContent: 'space-between' },

    card: {
        backgroundColor: '#fff', borderWidth: 2, borderColor: '#000', borderRadius: 15,
        padding: 10, marginBottom: 15, width: '48%', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5,
    },
    foodImage: { width: 100, height: 100, marginBottom: 10, },
    foodName: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },

    priceContainer: { alignItems: 'center', marginBottom: 10, height: 40, justifyContent: 'center' },
    unitPrice: { fontSize: 13, color: '#555', fontWeight: 'bold' },
    totalItemPrice: { fontSize: 14, color: '#000', fontWeight: '900', marginTop: 2 },

    quantityContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between' },
    qtyBtn: {
        backgroundColor: '#EBE3CD', borderWidth: 2, borderColor: '#000', borderRadius: 8,
        width: 35, height: 35, justifyContent: 'center', alignItems: 'center'
    },
    qtyBtnText: { fontSize: 20, fontWeight: 'bold', color: '#000', marginTop: -2 },
    qtyInput: {
        flex: 1, height: 35, marginHorizontal: 5, borderWidth: 2,
        borderColor: '#000', borderRadius: 8, textAlign: 'center', fontSize: 16, fontWeight: 'bold',
        backgroundColor: '#fff', paddingVertical: 0, paddingTop: 0, paddingBottom: 0,
    },

    checkoutBar: {
        position: 'absolute', bottom: 20, left: 20, right: 20,
        backgroundColor: '#fff', borderWidth: 2, borderColor: '#000', borderRadius: 15,
        padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 10,
    },
    checkoutTotalItems: { fontSize: 14, color: '#555', fontWeight: 'bold' },
    checkoutTotalPrice: { fontSize: 18, color: '#000', fontWeight: '900' },
    checkoutBtn: {
        backgroundColor: '#4AFF88', borderWidth: 2, borderColor: '#000', borderRadius: 10,
        paddingVertical: 10, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center'
    },
    checkoutBtnText: { fontSize: 16, fontWeight: '900', color: '#000' }
});
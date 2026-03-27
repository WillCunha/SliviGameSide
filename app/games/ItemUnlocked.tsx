import { CLOTHES_IMAGES } from '@/src/components/clothes/clothesMap';
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
// 1. Importando o Audio do expo-av
import { Audio } from 'expo-av';

interface ClothData {
    id: number;
    name: string;
    slug: string;
    category: string;
    temperature: number;
}

export default function ItemUnlocked() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const clothId = Number(params.clothId);

    const [cloth, setCloth] = useState<ClothData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    
    const [titleText, setTitleText] = useState("VOCÊ DESBLOQUEOU UMA RECOMPENSA!");

    const boxScale = useRef(new Animated.Value(0)).current;
    const boxRotation = useRef(new Animated.Value(0)).current;
    const itemScale = useRef(new Animated.Value(0)).current;
    const itemTranslateY = useRef(new Animated.Value(50)).current; 
    
    const titleOpacity = useRef(new Animated.Value(0)).current; 
    const buttonOpacity = useRef(new Animated.Value(0)).current;
    const floatBoxY = useRef(new Animated.Value(0)).current;
    const floatImageY = useRef(new Animated.Value(0)).current;

    const boxFloatAnimation = useRef<Animated.CompositeAnimation | null>(null);

    // --- Referências para os Áudios ---
    const soundAppearRef = useRef<Audio.Sound | null>(null);
    const soundCoralRef = useRef<Audio.Sound | null>(null);

    // 1. Busca os dados da API
    useEffect(() => {
        const fetchClothDetails = async () => {
            try {
                const response = await fetch(`https://api.wfsoft.com.br/slivi-game/api/slivi/wardrobe/cloth/${clothId}`);
                const json = await response.json();
                if (json.success) {
                    setCloth(json.data);
                }
            } catch (error) {
                console.error("Erro ao buscar detalhes da roupa:", error);
            } finally {
                setLoading(false);
            }
        };

        if (clothId) fetchClothDetails();
    }, [clothId]);

    // --- Limpeza dos áudios ao sair da tela ---
    useEffect(() => {
        return () => {
            if (soundAppearRef.current) soundAppearRef.current.unloadAsync();
            if (soundCoralRef.current) soundCoralRef.current.unloadAsync();
        };
    }, []);

    // --- Função para tocar os áudios ---
    const playSound = async (type: 'appear' | 'coral') => {
        try {
            if (type === 'appear') {
                // ATENÇÃO: Ajuste o caminho do áudio da caixa surgindo!
                const { sound } = await Audio.Sound.createAsync(
                    require('@/assets/audios/effects/box_entrance.mp3') 
                );
                soundAppearRef.current = sound;
                await sound.playAsync();
            } else if (type === 'coral') {
                // ATENÇÃO: Ajuste o caminho do áudio do coral!
                const { sound } = await Audio.Sound.createAsync(
                    require('@/assets/audios/effects/coral_saida_objeto.mp3') 
                );
                soundCoralRef.current = sound;
                await sound.playAsync();
            }
        } catch (error) {
            console.log("Erro ao tocar o áudio:", error);
        }
    };

    const startBoxFloat = () => {
        boxFloatAnimation.current = Animated.loop(
            Animated.sequence([
                Animated.timing(floatBoxY, {
                    toValue: -15, 
                    duration: 1200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(floatBoxY, {
                    toValue: 0, 
                    duration: 1200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                })
            ])
        );
        boxFloatAnimation.current.start();
    };

    const startImageFloat = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatImageY, {
                    toValue: -10,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(floatImageY, {
                    toValue: 0,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                })
            ])
        ).start();
    };

    // 2. Animação de entrada da tela
    useEffect(() => {
        if (!loading && cloth) {
            
            // TOCA O ÁUDIO DA CAIXA SURGINDO
            playSound('appear');

            Animated.timing(titleOpacity, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }).start();

            Animated.parallel([
                Animated.spring(boxScale, {
                    toValue: 1,
                    friction: 5,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(boxRotation, {
                    toValue: 1,
                    duration: 800,
                    easing: Easing.out(Easing.back(1.5)),
                    useNativeDriver: true,
                })
            ]).start(() => {
                if (!isOpen) startBoxFloat();
            });
        }
    }, [loading, cloth]);

    // 3. Ação de abrir a caixa
    const handleOpenBox = () => {
        if (isOpen) return; 

        setIsOpen(true); 
        
        // TOCA O CORAL QUANDO A CAIXA É CLICADA
        playSound('coral');
        
        if (boxFloatAnimation.current) boxFloatAnimation.current.stop();
        Animated.timing(floatBoxY, { toValue: 0, duration: 200, useNativeDriver: true }).start();

        Animated.timing(titleOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            
            setTitleText("RECOMPENSA OBTIDA!!");

            Animated.sequence([
                Animated.parallel([
                    Animated.spring(itemScale, {
                        toValue: 1,
                        friction: 4,
                        useNativeDriver: true,
                    }),
                    Animated.timing(itemTranslateY, {
                        toValue: -80,
                        duration: 500,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(titleOpacity, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    })
                ]),
                Animated.timing(buttonOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                })
            ]).start(() => {
                startImageFloat();
            });
        });
    };

    const spin = boxRotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#FFD700" />
                <Text style={styles.loadingTxt}>Carregando...</Text>
            </View>
        );
    }

    if (!cloth) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Erro ao carregar o brinde!</Text>
                <Pressable onPress={() => router.back()} style={styles.button}>
                    <Text style={styles.buttonText}>Voltar</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <LinearGradient
            colors={['#7B2FF7', '#9D4EDD', '#C77DFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
        >
            <View style={styles.container}>
                <Animated.Text style={[styles.title, { opacity: titleOpacity }]}>
                    {titleText}
                </Animated.Text>

                <View style={styles.animationArea}>
                    {isOpen && (
                        <Animated.View style={[
                            styles.itemContainer,
                            {
                                transform: [
                                    { scale: itemScale },
                                    { translateY: itemTranslateY }
                                ]
                            }
                        ]}>
                            <Animated.Image
                                source={CLOTHES_IMAGES[cloth.slug]}
                                style={[
                                    styles.clothImage,
                                    { transform: [{ translateY: floatImageY }] } 
                                ]}
                                resizeMode="contain"
                            />
                            <Text style={styles.clothName}>{cloth.name}</Text>
                            <Text style={styles.clothCategory}>Categoria: {cloth.category}</Text>
                        </Animated.View>
                    )}

                    <Pressable onPress={handleOpenBox} disabled={isOpen}>
                        <Animated.Image
                            source={
                                isOpen
                                    ? require('@/assets/images/boxes/gift_box_open.png')
                                    : require('@/assets/images/boxes/gift_box_closed.png')
                            }
                            style={[
                                styles.boxImage,
                                styles.boxShadow,
                                !isOpen && { transform: [{ translateY: floatBoxY }, { scale: boxScale }, { rotate: spin }] }
                            ]}
                            resizeMode="contain"
                        />
                    </Pressable>
                </View>

                <Animated.View style={{ opacity: buttonOpacity, marginTop: 40 }}>
                    <Pressable onPress={() => router.push('../loading')} style={styles.button}>
                        <Text style={styles.buttonText}>CONTINUAR!</Text>
                    </Pressable>
                </Animated.View>
            </View>
        </LinearGradient>
    );
}

// ... seus estilos continuam iguais aqui embaixo ...
const styles = StyleSheet.create({
    gradient: { flex: 1, paddingTop: 30, paddingHorizontal: 30 },
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 32, fontWeight: 'bold', color: '#FFF', marginBottom: 20, textAlign: 'center', textShadowColor: 'rgba(255, 215, 0, 0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
    animationArea: { width: 300, height: 400, justifyContent: 'center', alignItems: 'center' },
    boxImage: { width: 250, height: 350, zIndex: 10 },
    boxShadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 10 },
    itemContainer: { position: 'absolute', alignItems: 'center', zIndex: 5 },
    clothImage: { width: 400, height: 450 },
    clothName: { fontSize: 30, fontWeight: 'bold', color: '#FFF', marginTop: 10, textAlign: 'center', textTransform: 'uppercase', textShadowColor: "rgba(0,0,0,0.4)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
    clothCategory: { fontSize: 14, color: '#bebebec0', textTransform: 'uppercase', marginTop: 5 },
    button: { backgroundColor: '#FFD700', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, elevation: 3 },
    buttonText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
    loadingTxt: { color: '#FFD700', fontSize: 18, marginBottom: 20, fontWeight: '800' },
    errorText: { color: '#FF5555', fontSize: 18, marginBottom: 20 }
});
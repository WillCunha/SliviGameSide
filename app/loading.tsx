import { syncUserLocation } from '@/src/api/weatherClient';
import { updateDeviceToken } from '@/src/services/authService';
import { fetchSliviState } from '@/src/services/sliviService';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ImageBackground, Platform, StyleSheet, Text, View } from 'react-native';

// --- IMPORTS PARA PRELOAD DE ASSETS ---
import { CITY_SOUNDS } from '@/src/components/city/city';
import { CLOTHES_IMAGES } from '@/src/components/clothes/clothesMap';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import * as Font from 'expo-font';

export default function LoadingScreen() {
    const router = useRouter();
    const { token, userId, isNewUser, unlockEvent } = useLocalSearchParams();

    const [error, setError] = useState("");

    // --- ESTADO PARA CONTROLAR O TEXTO ---
    const [loadingText, setLoadingText] = useState("Aguarde! Conectando-se ao servidor da WF.");

    const imgBg = require('../assets/images/splash-screen.png');

    // Função que faz o pré-carregamento dos recursos visuais
    async function cacheAssetsAsync(sliviState: any) {
        const images = [
            require('@/assets/images/weather/city_sunny.png'),
            require('@/assets/images/weather/city_rain.png'),
            require('@/assets/images/weather/city_night.png'),
            require('@/assets/images/components/windows/normal_window_gameV2.png'),
            require('@/assets/images/personagem/mouth/mouth_open.png'),
            require('@/assets/images/personagem/mouth/mouth_neutro.png'),
            require('@/assets/images/components/s-coins_logo.png')
        ];

        const audios: any[] = [
            require('@/assets/audios/effects/mood_change_positive.mp3'),
            require('@/assets/audios/effects/conquista/epic_food_reward_02.mp3')
        ];

        // 2. Extrai dinamicamente todos os áudios do seu objeto CITY_SOUNDS
        Object.values(CITY_SOUNDS).forEach(category => {
            if (category && category.audios) {
                category.audios.forEach(audioRef => {
                    audios.push(audioRef);
                });
            }
        });

        if (sliviState && sliviState.clothing) {
            const equippedSlugs = Object.values(sliviState.clothing);

            equippedSlugs.forEach((slug: any) => {
                const imageRef = CLOTHES_IMAGES[slug];
                if (imageRef) {
                    images.push(imageRef); // Adiciona na fila de download!
                }
            });
        }

        const cacheImages = images.map(image => {
            return Asset.fromModule(image).downloadAsync();
        });

        const cacheFonts = Font.loadAsync({
            ...Ionicons.font,
            ...MaterialCommunityIcons.font,
        });

        await Promise.all([...cacheImages, cacheFonts]);
    }

    useEffect(() => {
        if (!token) return;

        async function registerForPushNotificationsAsync() {
            let pushToken;

            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            }

            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Permissão para notificações negada.');
                return null;
            }

            try {
                const projectId =
                    Constants?.expoConfig?.extra?.eas?.projectId ??
                    Constants?.easConfig?.projectId;

                pushToken = (await Notifications.getExpoPushTokenAsync({
                    projectId: projectId,
                })).data;

                return pushToken;
            } catch (e) {
                console.log("Erro ao obter push token:", e);
                return null;
            }
        }

        async function prepareGameEnvironment() {
            try {
                // 1. Tenta pegar o device token e enviar pra API
                const deviceToken = await registerForPushNotificationsAsync();
                if (deviceToken) {
                    await updateDeviceToken(token as string, deviceToken).catch(console.error);
                }

                // 2. Busca os dados simultaneamente
                const [sliviState, weatherData] = await Promise.all([
                    fetchSliviState(token as string),
                    syncUserLocation(Number(userId) || 1)
                ]);

                // 3. MUDANÇA DE TEXTO: Os dados chegaram!
                setLoadingText("Carregando...");

                // 4. Inicia o cache das imagens e ícones
                await cacheAssetsAsync(sliviState);

                // 5. Transforma os objetos em strings para passar via params
                const stateString = JSON.stringify(sliviState);
                const weatherString = JSON.stringify(weatherData);

                // 6. Tudo pronto! Envia para a Home
                router.replace({
                    pathname: './home',
                    params: {
                        token,
                        userId,
                        initialSliviState: stateString,
                        initialWeather: weatherString,
                        isNewUser,
                        unlockEvent: unlockEvent
                    },
                });

            } catch (error) {
                setError("Não foi possível se conectar ao servidor da WF.");
            }
        }

        prepareGameEnvironment();
    }, [token]);

    return (
        <View style={styles.root}>
            <StatusBar style="light" />
            <ImageBackground source={imgBg} style={styles.background} imageStyle={styles.imageStyle}>
                <View style={styles.content}>
                    <ActivityIndicator size="large" color="#fff" />
                    {error ? (
                        <Text style={styles.errorText}>
                            {error}
                        </Text>
                    ) : (
                        <Text style={styles.text}>{loadingText}</Text>
                    )}
                </View>
            </ImageBackground>
        </View>
    );
}

// ... styles mantidos iguais ...
const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    background: {
        flex: 1,
    },
    imageStyle: {
        resizeMode: 'cover',
    },
    content: {
        position: 'absolute',
        bottom: 40,
        width: '100%',
        alignItems: 'center',
    },
    text: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginTop: 8,
    },
    errorText: {
        color: 'rgb(255, 0, 0)',
        backgroundColor: '#000',
        padding: 6,
        fontSize: 14,
        borderRadius: 8,
        marginTop: 10,
    },
});
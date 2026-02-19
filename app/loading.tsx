import { syncUserLocation } from '@/src/api/weatherClient';
import { updateDeviceToken } from '@/src/services/authService'; // <--- IMPORTANTE: ajuste o caminho se necessário
import { fetchSliviState } from '@/src/services/sliviService';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications'; // <--- IMPORTANTE
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ImageBackground, Platform, StyleSheet, Text, View } from 'react-native';

const params = useLocalSearchParams();

export default function LoadingScreen() {
    const router = useRouter();
    const { token, userId } = useLocalSearchParams();

    const [error, setError] = useState("");

    const imgBg = require('../assets/images/splash-slivi.png');

    useEffect(() => {
        if (!token) return;

        // Função para registrar e obter o token de Push
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
                return null; // Usuário não autorizou
            }

            try {
                const projectId =
                    Constants?.expoConfig?.extra?.eas?.projectId ??
                    Constants?.easConfig?.projectId;

                pushToken = (await Notifications.getExpoPushTokenAsync({
                    projectId: projectId, // Passando o ID aqui!
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
                    // Atualiza silenciosamente na API
                    await updateDeviceToken(token as string, deviceToken).catch(console.error);
                }

                // 2. Busca os dados simultaneamente (Mantendo seu código original)
                const [sliviState, weatherData] = await Promise.all([
                    fetchSliviState(token as string),
                    syncUserLocation(Number(userId) || 1)
                ]);

                // 3. Transforma os objetos em strings para passar via params
                const stateString = JSON.stringify(sliviState);
                const weatherString = JSON.stringify(weatherData);

                // 4. Tudo pronto! Envia para a Home com os dados já carregados
                router.replace({
                    pathname: '/home',
                    params: {
                        token,
                        userId,
                        initialSliviState: stateString,
                        initialWeather: weatherString
                    },
                });

            } catch (error) {
                setError("Não foi possível se conectar ao servidor da WF.")
                router.replace('/');
            }
        }

        prepareGameEnvironment();
    }, [token]);

    return (
        // ... mantenha seu return exatamente igual ...
        <View style={styles.root}>
            <StatusBar style="light" />
            <ImageBackground source={imgBg} style={styles.background} imageStyle={styles.imageStyle}>
                <View style={styles.content}>
                    <ActivityIndicator size="large" color="#fff" />
                    {error ? (
                        <Text style={styles.errorText}>
                            Erro: Não foi possível se conectar ao servidor da WF.
                        </Text>
                    ) : <Text style={styles.text}>Aguarde! Conectando-se ao servidor da WF.</Text>}
                </View>
            </ImageBackground>
        </View>
    );
}

// ... mantenha os seus styles ...

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

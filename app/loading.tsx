import { syncUserLocation } from '@/src/api/weatherClient';
import { fetchSliviState } from '@/src/services/sliviService';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ImageBackground, StyleSheet, Text, View } from 'react-native';

const params = useLocalSearchParams();

export default function LoadingScreen() {
    const router = useRouter();
    const { token, userId } = useLocalSearchParams();

    const [error, setError] = useState("");

    const imgBg = require('../assets/images/splash-slivi.png');

    useEffect(() => {

        if (!token) return;

        async function prepareGameEnvironment() {
            try {
                // 1. Busca os dados simultaneamente para ser mais rápido (Promise.all)
                const [sliviState, weatherData] = await Promise.all([
                    fetchSliviState(token as string),
                    syncUserLocation(Number(userId) || 1)
                ]);

                // 2. Transforma os objetos em strings para passar via params (limitação do expo-router)
                const stateString = JSON.stringify(sliviState);
                const weatherString = JSON.stringify(weatherData);

                //3. Tudo pronto! Envia para a Home com os dados já carregados
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
                // Em caso de erro, você pode redirecionar de volta pro login e limpar o SecureStore
                router.replace('/');
            }
        }

        if (token) {
            prepareGameEnvironment();
        }
    }, [token]);

    return (

        <View style={styles.root}>
            <StatusBar style="light" />
            <ImageBackground
                source={imgBg}
                style={styles.background}
                imageStyle={styles.imageStyle}
            >
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

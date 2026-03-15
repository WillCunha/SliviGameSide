import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet } from 'react-native';

const CLEAN_CIMA = require('@/assets/images/components/window_elements/cleaner_cima.png'); 
const CLEAN_MEDIO = require('@/assets/images/components/window_elements/cleaner_medio.png'); 

// Configurações de tempo
const CLEANING_DURATION_MS = 3 * 60 * 1000; // 3 minutos
const COOLDOWN_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 3 dias

interface WindowCleanerProps {
  weatherCondition: string;
  windowSize: number;
}

export default function WindowCleanerAnimation({ weatherCondition, windowSize }: WindowCleanerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(CLEAN_CIMA);
  
  // Animação de subida/descida
  const translateY = useRef(new Animated.Value(-windowSize)).current; // Começa escondido no topo

  useEffect(() => {
    checkAndStartCleaning();
  }, [weatherCondition]);

  // Alterna as imagens para simular a limpeza
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCleaning) {
      interval = setInterval(() => {
        setCurrentFrame(prev => prev === CLEAN_CIMA ? CLEAN_MEDIO : CLEAN_CIMA);
      }, 600); // Troca a cada 600ms
    }
    return () => clearInterval(interval);
  }, [isCleaning]);

  const checkAndStartCleaning = async () => {
    if (weatherCondition !== 'sun') return;

    try {
      const now = Date.now();
      const lastCleanStr = await AsyncStorage.getItem('@slivi_last_clean');
      const sessionExpiryStr = await AsyncStorage.getItem('@slivi_clean_expiry');
      
      const lastClean = lastCleanStr ? parseInt(lastCleanStr) : 0;
      const sessionExpiry = sessionExpiryStr ? parseInt(sessionExpiryStr) : 0;

      // CENÁRIO 1: O usuário voltou pro app antes dos 3 minutos acabarem
      if (sessionExpiry > now) {
        startSession(sessionExpiry - now, true); // Retorna instantaneamente
        return;
      }

      // CENÁRIO 2: Já se passaram 3 dias desde a última vez? Se sim, inicia nova limpeza
      if (now - lastClean >= COOLDOWN_DAYS_MS) {
        const newExpiry = now + CLEANING_DURATION_MS;
        await AsyncStorage.setItem('@slivi_last_clean', now.toString());
        await AsyncStorage.setItem('@slivi_clean_expiry', newExpiry.toString());
        startSession(CLEANING_DURATION_MS, false); // Anima ele descendo
      }
    } catch (error) {
      console.log("Erro ao checar limpador:", error);
    }
  };

  const startSession = (timeLeft: number, instantAppear: boolean) => {
    setIsVisible(true);
    setIsCleaning(true);

    // Desce a plataforma
    Animated.timing(translateY, {
      toValue: 0, // Centro da janela
      duration: instantAppear ? 0 : 3000, // Se recarregou o app, ele já tá lá, se não, anima 3s
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Programa a saída dele quando o tempo acabar
    setTimeout(() => {
      setIsCleaning(false); // Para de esfregar
      
      // Anima descendo pro próximo andar
      Animated.timing(translateY, {
        toValue: windowSize + 50, // Vai para baixo da janela
        duration: 4000,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false); // Remove da tela após animar
      });
    }, timeLeft);
  };

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <Image 
        source={currentFrame} 
        style={styles.cleanerImage} 
        resizeMode="contain" 
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5, // Fica atrás da moldura da janela, mas na frente do fundo
  },
  cleanerImage: {
    width: '80%', 
    height: '80%', 
    opacity: 0.9, // Dar um leve ar de que ele está atrás do vidro
  }
});
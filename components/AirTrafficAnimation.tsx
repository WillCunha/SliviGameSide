import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

const { width } = Dimensions.get('window');
const WINDOW_SIZE = width * 0.6;

const HELI_RIGHT = require('@/assets/images/components/window_elements/elemento_helicoptero_right.png');
const HELI_LEFT = require('@/assets/images/components/window_elements/elemento_helicoptero_left.png');
const AIRPLANE = require('@/assets/images/components/window_elements/elemento_aviaoV2.png');

export default function AirTrafficAnimation() {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current; // Efeito de distância/névoa

  const [vehicle, setVehicle] = useState<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const animateTraffic = () => {
    const type = Math.floor(Math.random() * 3);
    const duration = 7000 + Math.random() * 5000; 

    let startX = 0;
    let endX = 0;
    let startY = 0;
    let imageSource = null;
    let startScale = 1;
    let endScale = 1;
    let startOpacity = 1;
    let endOpacity = 1;

    if (type === 0) {
      // HELICÓPTERO: Direita -> Esquerda (Se distanciando)
      imageSource = HELI_LEFT; 
      startX = WINDOW_SIZE + 100;
      endX = -150;
      startY = Math.random() * (WINDOW_SIZE * 0.4);
      startScale = 1.1; 
      endScale = 0.3;   // Fica bem pequeno
      startOpacity = 1;
      endOpacity = 0.4; // Fica "nebuloso" ao longe
    } else if (type === 1) {
      // HELICÓPTERO: Esquerda -> Direita (Se aproximando)
      imageSource = HELI_RIGHT;
      startX = -150;
      endX = WINDOW_SIZE + 100;
      startY = Math.random() * (WINDOW_SIZE * 0.5);
      startScale = 0.3; 
      endScale = 1.1;   
      startOpacity = 0.4;
      endOpacity = 1;
    } else {
      // AVIÃO: Esquerda -> Direita (Direção correta da imagem)
      imageSource = AIRPLANE;
      startX = -200; // Começa fora da tela na esquerda
      endX = WINDOW_SIZE + 200; // Vai até o fim na direita
      startY = WINDOW_SIZE * 0.1; // Aerovia alta e fixa
      startScale = 0.7; // Avião costuma estar mais longe que helicópteros
      endScale = 0.7;
      startOpacity = 0.8;
      endOpacity = 0.8;
    }

    setVehicle({ imageSource });

    // Resetar valores para o início da animação
    translateX.setValue(startX);
    translateY.setValue(startY);
    scaleAnim.setValue(startScale);
    opacityAnim.setValue(startOpacity);

    // Executar todas as animações juntas
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: endX,
        duration: duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: endScale,
        duration: duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: endOpacity,
        duration: duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ]).start(({ finished }) => {
      if (finished) {
        const delay = 9000 + Math.random() * 10000;
        timeoutRef.current = setTimeout(animateTraffic, delay);
      }
    });
  };

  useEffect(() => {
    animateTraffic();
    return () => {
      translateX.stopAnimation();
      scaleAnim.stopAnimation();
      opacityAnim.stopAnimation();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!vehicle) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.Image
        source={vehicle.imageSource}
        style={[
          styles.aircraft,
          {
            opacity: opacityAnim,
            transform: [
              { translateX: translateX },
              { translateY: translateY },
              { scale: scaleAnim }
            ]
          }
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    overflow: 'hidden',
  },
  aircraft: {
    position: 'absolute',
    width: 120, // Tamanho base aumentado para o avião não ficar sumindo
    height: 70,
  }
});
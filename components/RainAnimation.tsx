import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

// Use Dimensions.get('window') para garantir que as gotas se espalhem
// por toda a largura possível, mesmo que o container corte as bordas.
const { width, height } = Dimensions.get('window');

// AUMENTAMOS AQUI: De 40 para 150 (ou mais se o celular aguentar)
// Como sua janela é pequena e corta parte da chuva, precisamos de muitas gotas
// para garantir que a área visível fique cheia.
const RAIN_COUNT = 300; 

const RainDrop = ({ delay, startX, duration }: { delay: number, startX: number, duration: number }) => {
  const dropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      dropAnim.setValue(0);
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dropAnim, {
          toValue: 1,
          duration: duration,
          easing: Easing.linear,
          useNativeDriver: true, 
        })
      ]).start(() => animate());
    };
    animate();
  }, []);

  const translateY = dropAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, height + 100] // Aumentei o range para garantir que atravessem tudo
  });

  return (
    <Animated.View
      style={[
        styles.drop,
        {
          left: startX,
          transform: [{ translateY }]
        }
      ]}
    />
  );
};

export default function RainAnimation() {
  const drops = useRef(
    Array.from({ length: RAIN_COUNT }).map((_, i) => ({
      id: i,
      startX: Math.random() * width,
      delay: Math.random() * 2000,
      // VELOCIDADE: Reduzi os valores para a chuva cair mais rápido (tempestade)
      // Antes era 800 a 1600ms. Agora é 400 a 900ms.
      duration: 400 + Math.random() * 500 
    }))
  ).current;

  return (
    <View style={styles.container} pointerEvents="none">
      {drops.map((drop) => (
        <RainDrop 
          key={drop.id} 
          startX={drop.startX} 
          delay={drop.delay} 
          duration={drop.duration} 
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    overflow: 'hidden',
  },
  drop: {
    position: 'absolute',
    top: 0,
    width: 2,       
    height: 40,     // Aumentei um pouco o comprimento da gota (rastro)
    backgroundColor: '#AEE1FF', 
    opacity: 0.6,   // Levemente mais transparente para não ficar um borrão branco
    borderRadius: 5,
  },
});
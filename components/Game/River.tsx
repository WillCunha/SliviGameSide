import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, Image, StyleSheet, View } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RiverProps {
  isRunning: boolean;
  isTurbulence: boolean;
}

export default function River({ isRunning, isTurbulence }: RiverProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isRunning) return;

    anim.setValue(0);

    Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: isTurbulence ? 1400 : 3500, // Ajuste a velocidade do rio aqui
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    return () => anim.stopAnimation();
  }, [isRunning, isTurbulence]);

  // A água precisa descer. O translateY vai de 0 até a altura exata de uma tela.
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_HEIGHT],
  });

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.stream,
          {
            transform: [{ translateY }],
            opacity: isTurbulence ? 0.9 : 0.6,
          },
        ]}
      >
        {/* Renderizamos DUAS imagens, cada uma com a altura exata da tela */}
        <Image source={require('@/assets/images/components/river/river.png')} style={styles.image} />
        <Image source={require('@/assets/images/components/river/river.png')} style={styles.image} />
      </Animated.View>

      {isTurbulence && <View style={styles.turbulenceOverlay} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: '#053d4f', // Uma cor de fundo base para o rio
  },
  stream: {
    position: 'absolute',
    top: -SCREEN_HEIGHT, // Começa exatamente uma tela para cima
    width: '100%',
    height: SCREEN_HEIGHT * 2, // Altura total de duas telas
  },
  image: {
    width: '100%',
    height: SCREEN_HEIGHT,
    resizeMode: 'cover', // Cover garante que preencha as bordas sem deixar espaços em branco
  },
  turbulenceOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 40, 70, 0.35)',
  },
});
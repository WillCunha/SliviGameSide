import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

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
        duration: isTurbulence ? 1400 : 4200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    return () => anim.stopAnimation();
  }, [isRunning, isTurbulence]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 300],
  });

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.stream,
          {
            transform: [{ translateY }],
            opacity: isTurbulence ? 0.9 : 0.7,
          },
        ]}
      >
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
  },
  stream: {
    position: 'absolute',
    top: -300,
    width: '100%',
    height: 600,
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'repeat',
  },
  turbulenceOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 40, 70, 0.25)',
  },
});

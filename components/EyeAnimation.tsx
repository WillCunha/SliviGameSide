import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { EYES_BY_EMOTION } from '../src/components/slivi/eyesMap';

type Props = {
  emotion: keyof typeof EYES_BY_EMOTION;
  size?: number;
};

export const NaturalEyes = ({ emotion, size = 120 }: Props) => {
  const EYES = EYES_BY_EMOTION[emotion] ?? EYES_BY_EMOTION.FELIZ;
  const [currentIndex, setCurrentIndex] = useState(0);


  useEffect(() => {
    console.log("Emoção " + emotion);
    let timeout: number;

    const weightedRandom = () => {
      const total = EYES.reduce((acc, e) => acc + e.weight, 0);
      const rand = Math.random() * total;
      let sum = 0;

      for (let i = 0; i < EYES.length; i++) {
        sum += EYES[i].weight;
        if (rand <= sum) return i;
      }
      return 0;
    };

    const animate = () => {
      let next = weightedRandom();
      if (next === currentIndex) next = weightedRandom();

      setCurrentIndex(next);

      let delay = 2000 + Math.random() * 3000;
      const r = Math.random();

      if (r < 0.25) delay = 300 + Math.random() * 600;
      if (r > 0.95) {
        delay = 150;
        setTimeout(() => setCurrentIndex(weightedRandom()), 150);
      }

      timeout = setTimeout(animate, delay);
    };

    animate();
    return () => clearTimeout(timeout);
  }, [emotion, currentIndex]);

  return (
    <View style={styles.container}>
      <Image
        source={EYES[currentIndex].src}
        style={{
          width: size,
          height: size,
          resizeMode: "contain",
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});

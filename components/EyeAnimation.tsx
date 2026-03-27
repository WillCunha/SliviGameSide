import { Emotion } from "@/src/types/emotions";
import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { EYES_BY_EMOTION } from '../src/components/slivi/eyesMap';

type Props = {
  emotion?: Emotion;
  size?: number;
};

export const NaturalEyes = ({ emotion = 'FELIZ', size = 120 }: Props) => {
  const EYES = (EYES_BY_EMOTION as any)[emotion] ?? EYES_BY_EMOTION.FELIZ;
  const [currentIndex, setCurrentIndex] = useState(0);

  const safeIndex = currentIndex >= EYES.length ? 0 : currentIndex;
  const currentEye = EYES[safeIndex];

  useEffect(() => {
    setCurrentIndex(0);
  }, [emotion]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const weightedRandom = () => {
      const total = EYES.reduce((acc: number, e: any) => acc + e.weight, 0);
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

      // Evita repetir o mesmo frame em sequência, a menos que só exista 1 frame
      if (next === safeIndex && EYES.length > 1) {
        next = weightedRandom();
      }

      setCurrentIndex(next);

      let delay = 2000 + Math.random() * 3000;
      const r = Math.random();

      if (r < 0.25) delay = 300 + Math.random() * 600;
      if (r > 0.95) {
        delay = 150;
        // Limpa o timeout interno caso o componente desmonte rápido
        timeout = setTimeout(() => setCurrentIndex(weightedRandom()), 150);
      }

      timeout = setTimeout(animate, delay);
    };

    animate();
    return () => clearTimeout(timeout);
  }, [emotion, safeIndex, EYES]);

  // Prevenção extra caso o objeto da emoção não tenha nenhum frame configurado no map
  if (!currentEye) return null;

  return (
    <View style={styles.container}>
      <Image
        source={currentEye.src}
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
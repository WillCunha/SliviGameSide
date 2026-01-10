// slivi.tsx
import { bodyByEmotion } from '@/src/components/slivi/bodyMap';
import { mouthByEmotion } from '@/src/components/slivi/mouthByEmotion';
import { Emotion } from '@/src/types/emotions';
import { Image, ImageSourcePropType, StyleSheet, View, ViewStyle } from 'react-native';
import { NaturalEyes } from './EyeAnimation';

type Props = {
  scale?: number;
  style?: ViewStyle;
  emotion: Emotion;
  // 👇 Adicionamos esta prop opcional
  mouthOverride?: ImageSourcePropType | null; 
};

export default function Slivi({ scale = 1, style, emotion, mouthOverride }: Props) {

  // ... (mantenha suas constantes de tamanho/posicionamento aqui: bodyWidth, eyesTopOffset, etc.)
  const bodyWidth = 400 * scale;
  const bodyHeight = 400 * scale;
  const eyeWidth = 72 * scale;
  const mouthWidth = 95 * scale;
  const eyesTopOffset = bodyHeight * 0.29;
  const eyesHorizontalSpacing = 0 * scale; 
  const mouthTopOffset = bodyHeight * 0.5;

  return (
    <View style={[styles.wrapper, style]}>
      <View style={[styles.container, { width: bodyWidth, height: bodyHeight }]}>
        
        {/* Body continua respeitando a Emotion global */}
        <View style={styles.body}>
          <Image
            source={bodyByEmotion[emotion]}
            style={styles.bodyImg}
          />
        </View>

        <View
          style={[
            styles.eyesRow,
            {
              top: eyesTopOffset,
              left: (bodyWidth - (eyeWidth * 2 + eyesHorizontalSpacing)) / 2,
            },
          ]}
        >
          <NaturalEyes size={150} emotion={emotion} />
        </View>

        <View style={[styles.mouthWrap,
        {
          top: mouthTopOffset + 15,
          left: (bodyWidth - mouthWidth) / 2,
        },
        ]}>
          {/* 👇 A mágica acontece aqui: Usa o override SE existir, senão usa o padrão */}
          <Image source={mouthOverride || mouthByEmotion[emotion]} />
        </View>
      </View>
    </View>
  );
}

// ... (mantenha seus styles abaixo)
const styles = StyleSheet.create({
  // ... seus estilos existentes
  wrapper: { alignItems: 'center', justifyContent: 'center' },
  container: { position: 'relative' },
  body: { justifyContent: 'center', alignItems: 'center' },
  bodyImg: { width: 600, height: 600 }, // Ajuste conforme seu SVG
  eyesRow: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
  mouthWrap: { position: 'absolute' },
});
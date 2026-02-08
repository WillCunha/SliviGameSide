// slivi.tsx
import { bodyByEmotion } from '@/src/components/slivi/bodyMap';
import { mouthByEmotion } from '@/src/components/slivi/mouthByEmotion';
import { Emotion } from '@/src/types/emotions';
import { Image, ImageSourcePropType, StyleSheet, View, ViewStyle } from 'react-native';
import { NaturalEyes } from './EyeAnimation';

type Props = {
  scale?: number;
  size?: number;
  style?: ViewStyle;
  emotion: Emotion;
  eyeEmotion?: Emotion;
  mouthOverride?: ImageSourcePropType | null; 
};

export default function Slivi({ scale = 1, size = 400, style, emotion, eyeEmotion, mouthOverride }: Props) {

  // ... (mantenha suas constantes de tamanho/posicionamento aqui: bodySize, eyesTopOffset, etc.)
  const BASE_SIZE = 400;
  const ratio = size / BASE_SIZE;
  const bodySize = size;
  const eyeWidth = 72 * ratio;
  const eyesTopOffset = bodySize * 0.26;
  const eyeDisplaySize = 150 * ratio;
  const eyesHorizontalSpacing = 0 * scale; 
  const mouthWidth = 65 * ratio;
  const mouthTopOffset = bodySize * 0.5;

  return (
    <View style={[styles.wrapper, style]}>
      <View style={[styles.container, { width: bodySize, height: bodySize }]}>
        
        <View style={styles.body}>
          <Image
            source={bodyByEmotion[emotion]}
            style={{width: bodySize, height:bodySize }} 
            resizeMode='contain'
          />
        </View>

        <View
          style={[
            styles.eyesRow,
            {
              top: eyesTopOffset,
              alignSelf: 'center',
            },
          ]}
        >
          <NaturalEyes size={eyeDisplaySize} emotion={eyeEmotion} />
        </View>

        <View style={[styles.mouthWrap,
        {
          top: mouthTopOffset + (15 * ratio),
          left: (bodySize - mouthWidth) / 2,
        },
        ]}>
          <Image source={mouthOverride || mouthByEmotion[emotion]}
                style={{width: mouthWidth, height: mouthWidth}}
                resizeMode='contain' />
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
  eyesRow: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
  mouthWrap: { position: 'absolute' },
});
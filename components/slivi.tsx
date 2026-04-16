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
  // ADICIONADO: Array de roupas ativas (chapéu, camisa, etc)
  clothingItems?: ImageSourcePropType[]; 
};

export default function Slivi({ 
  scale = 1, 
  size = 400, 
  style, 
  emotion, 
  eyeEmotion, 
  mouthOverride,
  clothingItems = [] // Inicializa vazio por padrão
}: Props) {

  const BASE_SIZE = 400;
  const ratio = size / BASE_SIZE;
  const bodySize = size;
  const eyeWidth = 72 * ratio;
  const eyesTopOffset = bodySize * 0.24;
  const eyeDisplaySize = 150 * ratio;
  const mouthWidth = 45 * ratio;
  const mouthTopOffset = bodySize * 0.5;

  return (
    <View style={[styles.wrapper, style]}>
      <View style={[styles.container, { width: bodySize, height: bodySize }]}>
        
        {/* 1. CORPO BASE DO SLIVI */}
        <View style={[styles.body, { width: bodySize, height: bodySize }]}>
          <Image
            source={bodyByEmotion[emotion]}
            style={{ width: '100%', height: '100%', position: 'absolute' }} 
            resizeMode='contain'
          />
          
          {/* 2. ROUPAS (Asset Stacking) */}
          {/* Renderiza cada peça de roupa por cima do corpo */}
          {clothingItems.map((item, index) => (
            <Image
              key={index}
              source={item}
              style={{ width: '100%', height: '100%', position: 'absolute', zIndex: 11, marginLeft: '0.7%' }}
              resizeMode='contain'
            />
          ))}
        </View> 

        {/* 3. OLHOS */}
        <View
          style={[
            styles.eyesRow,
            {
              top: eyesTopOffset,
              alignSelf: 'center',
              zIndex: 10, // Garante que o olho fique por cima de roupas (como golas)
            },
          ]}
        >
          <NaturalEyes size={eyeDisplaySize} emotion={eyeEmotion} />
        </View>

        {/* 4. BOCA */}
        <View style={[styles.mouthWrap,
        {
          top: mouthTopOffset + (2 * ratio),
          left: (bodySize - mouthWidth) / 2,
          zIndex: 10, // Garante que a boca fique por cima de roupas
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

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center' },
  container: { position: 'relative' },
  body: { position: 'absolute', top: 0, left: 0 }, // Alterado para absolute fill
  eyesRow: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
  mouthWrap: { position: 'absolute',  },
});
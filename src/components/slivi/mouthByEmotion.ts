import { ImageSourcePropType } from 'react-native';
import { Emotion } from '../../types/emotions';

export const mouthByEmotion: Record<Emotion, ImageSourcePropType> = {
  FELIZ: require('../../../assets/images/personagem/mouth/mouth_feliz.png'),
  TRISTE: require('../../../assets/images/personagem/mouth/mouth_sad.png'),
  ASSUSTADO: require('../../../assets/images/personagem/mouth/mouth_sad.png'),
  BRAVO: require('../../../assets/images/personagem/mouth/mouth_neutro.png'),
  CANSADO: require('../../../assets/images/personagem/mouth/mouth_sad.png'),
  NEUTRO: require('../../../assets/images/personagem/mouth/mouth_neutro.png'),
};

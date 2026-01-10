import { ImageSourcePropType } from 'react-native';
import { Emotion } from '../../types/emotions';

export const bodyByEmotion: Record<Emotion, ImageSourcePropType> = {
  FELIZ: require('../../../assets/images/personagem/body/body_laranja_feliz.png'),
  TRISTE: require('../../../assets/images/personagem/body/body_azul_triste.png'),
  ASSUSTADO: require('../../../assets/images/personagem/body/body_roxo_assustado.png'),
  BRAVO: require('../../../assets/images/personagem/body/body_verde_nervoso.png'),
  CANSADO: require('../../../assets/images/personagem/body/body_cinza_cansado.png'),
  NEUTRO: require('../../../assets/images/personagem/body/body_bege_neutro.png'),
};

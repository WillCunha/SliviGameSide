import { Emotion } from "@/src/types/emotions";

type EyeFrame = {
  src: any;
  weight: number;
};

export const EYES_BY_EMOTION: Record<Emotion, EyeFrame[]> = {
  FELIZ: [
    { src: require('../../../assets/images/personagem/eyes/olho_normal_centro.png'), weight: 55 },
    { src: require('../../../assets/images/personagem/eyes/olho_normal_esquerdo.png'), weight: 22 },
  ],

  ASSUSTADO: [
    { src: require('../../../assets/images/personagem/eyes/olho_assustado_centro.png'), weight: 55 },
    { src: require('../../../assets/images/personagem/eyes/olho_assustado_baixo.png'), weight: 22 },
    { src: require('../../../assets/images/personagem/eyes/olho_assustado_cima.png'), weight: 33 },
    { src: require('../../../assets/images/personagem/eyes/olho_assustado_direito.png'), weight: 25 },
  ],

  BRAVO: [
    { src: require('../../../assets/images/personagem/eyes/olho_bravo_centro.png'), weight: 55 },
    { src: require('../../../assets/images/personagem/eyes/olho_bravo_baixo.png'), weight: 22 },
    { src: require('../../../assets/images/personagem/eyes/olho_bravo_cima.png'), weight: 21 },
    { src: require('../../../assets/images/personagem/eyes/olho_bravo_direito.png'), weight: 35 },
    { src: require('../../../assets/images/personagem/eyes/olho_bravo_esquerdo.png'), weight: 35 },
  ],

  CANSADO: [
    { src: require('../../../assets/images/personagem/eyes/olho_cansado_centro.png'), weight: 55 },
  ],

  TRISTE: [
    { src: require('../../../assets/images/personagem/eyes/olho_triste_centro.png'), weight: 55 },
    { src: require('../../../assets/images/personagem/eyes/olho_triste_direito.png'), weight: 35 },
    { src: require('../../../assets/images/personagem/eyes/olho_triste_esquerdo.png'), weight: 35 },
  ],

  NEUTRO: [
    { src: require('../../../assets/images/personagem/eyes/olho_normal_centro.png'), weight: 55 },
    { src: require('../../../assets/images/personagem/eyes/olho_normal_esquerdo.png'), weight: 22 },
  ],

  // --- NOVAS EMOÇÕES ---
  // Dica: Para 'SONOLENTO', use olhos semicerrados.
  SONOLENTO: [
    { src: require('../../../assets/images/personagem/eyes/olho_cansado_centro.png'), weight: 100 },
  ],

  // Dica: Para 'DORMINDO', use olhos fechados.
  DORMINDO: [
    { src: require('../../../assets/images/personagem/eyes/olho_dormindo.png'), weight: 100 },
  ]


};

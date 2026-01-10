import Slivi from '@/components/slivi';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ImageSourcePropType, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Emotion } from '../types/emotions';

// --- IMPORTS DAS IMAGENS DE COMIDA E BOCA ---
// (Ajuste os caminhos conforme suas pastas reais)
const MOUTH_OPEN = require('../../assets/images/personagem/mouth/mouth_open.png'); 
const MOUTH_CLOSED = require('../../assets/images/personagem/mouth/mouth_neutro.png');

// Exemplo da Coxinha (pode vir de um arquivo separado depois)
const FOOD_SPRITES = [
  require('../../assets/images/food/full_chicken.png'),   // Estágio 0
  require('../../assets/images/food/first_bite_chicken.png'),  // Estágio 1
  require('../../assets/images/food/second_bite_chicken.png'),  // Estágio 2
  require('../../assets/images/food/finished_bite_chicken.png'),   // Estágio 3
];

const { width } = Dimensions.get('window');
const WINDOW_SIZE = width * 0.6;

type Props = {
  token: string;
}

export default function HomeScreen({ token }: Props) {
  // Estado original
  const [emotion, setEmotion] = useState<Emotion>('NEUTRO');
  const [loading, setLoading] = useState(true);
  
  // --- NOVOS ESTADOS PARA ALIMENTAÇÃO ---
  const [foodVisible, setFoodVisible] = useState(false); // Mostra ou esconde a comida
  const [foodStage, setFoodStage] = useState(0); // 0 a 3
  const [mouthOverride, setMouthOverride] = useState<ImageSourcePropType | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // ... (sua função loadState e useFocusEffect mantêm-se iguais) ...
  async function loadState() {
     // ... seu código existente ...
     setLoading(false); // apenas mockando para não quebrar o exemplo
  }

  useFocusEffect(
     // ... seu código existente ...
     useCallback(() => {}, [])
  );

  // --- LÓGICA DE COMER ---
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleEatClick = async () => {
    if (isAnimating || foodStage >= 3) return;

    setIsAnimating(true);

    // 1. Abre a boca
    setMouthOverride(MOUTH_OPEN);
    await wait(300);

    // 2. Fecha a boca (nhac!) e a comida diminui
    setMouthOverride(MOUTH_CLOSED);
    setFoodStage(prev => prev + 1);
    
    await wait(400); // tempo mastigando

    // 3. Volta ao normal (ou sorri se acabou)
    setMouthOverride(null); 
    
    // Se chegou no osso (índice 3), podemos definir uma emoção feliz
    if (foodStage + 1 === 3) {
      setEmotion('FELIZ');
      // Opcional: Esconder a comida depois de um tempo
      // setTimeout(() => setFoodVisible(false), 2000);
    }

    setIsAnimating(false);
  };

  // Função para "spawnar" a comida (simulando o usuário escolhendo no menu)
  const spawnFood = () => {
    setFoodVisible(true);
    setFoodStage(0);
    setEmotion('NEUTRO');
  };

  if (loading) return <ActivityIndicator size="large" />;

  return (
    <View style={styles.roomWall}>

      {/* --- JANELA (Seu código existente) --- */}
      <View style={styles.windowWrapper}>
        <Image source={require('../../assets/images/weather/clean_sky.png')} style={styles.skyBackground} resizeMode='stretch' />
        {/* <View style={styles.weatherLayer}><RainAnimation /></View> */}
        <Image source={require('../../assets/images/components/windows/normal_window_gameV2.png')} resizeMode='stretch' style={styles.windowFrameImage}/>
      </View>

      {/* --- ÁREA DO SLIVI + COMIDA --- */}
      <View style={styles.sliviArea}>
        
        {/* Passamos o mouthOverride aqui! */}
        <Slivi scale={1} emotion={emotion} mouthOverride={mouthOverride} />

        {/* --- A COMIDA (Só aparece se foodVisible for true) --- */}
        {foodVisible && (
          <TouchableOpacity 
            style={styles.foodContainer} 
            onPress={handleEatClick}
            activeOpacity={0.8}
          >
            <Image 
              source={FOOD_SPRITES[foodStage]} 
              style={[
                styles.foodImage, 
                isAnimating && { transform: [{ scale: 0.9 }] } // Efeito visual simples
              ]} 
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Botão TEMPORÁRIO para testar (depois você liga isso no seu menu de inventário) */}
      <View style={{ position: 'absolute', bottom: 100, elevation: 10, zIndex: 9999 }}>
        <TouchableOpacity onPress={spawnFood} style={{ backgroundColor: 'white', padding: 10, borderRadius: 8 }}>
          <Text>Pegar Comida</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  // ... seus estilos existentes ...
  roomWall: { flex: 1, backgroundColor: "#F2E8C9", alignItems: 'center', justifyContent: 'flex-start' },
  windowWrapper: { width: WINDOW_SIZE, height: WINDOW_SIZE, marginTop: 150, overflow: 'hidden', zIndex: 1, position: 'relative' },
  skyBackground: { width: '100%', height: '100%', position: 'absolute' },
  weatherLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1, opacity: 0.8 },
  windowFrameImage: { position: 'relative', width: '100%', height: '100%', zIndex: 10 },

  // Área ajustada
  sliviArea: {
    position: 'absolute',
    bottom: 100,
    zIndex: 10,
    alignItems: 'center', // Centraliza o Slivi e a comida
    justifyContent: 'center'
  },

  // Estilos da Comida
  foodContainer: {
    position: 'absolute',
    bottom: 0, // Ajuste para ficar na altura da mão ou boca
    right: -60, // Ajuste para ficar ao lado do Slivi
    zIndex: 20, // Fica na frente do Slivi
  },
  foodImage: {
    width: 80,
    height: 80,
  }
});
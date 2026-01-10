import RainAnimation from '@/components/RainAnimation';
import Slivi from '@/components/slivi';
import FoodModal from '@/src/components/foods/foodModal';
import { fetchSliviState } from '@/src/services/sliviService';
import { Emotion } from '@/src/types/emotions';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const WINDOW_SIZE = width * 0.6;

// --- CONFIGURAÇÃO DA COMIDA E BOCA ---
// Substitua pelos caminhos reais das imagens que você salvou
const MOUTH_OPEN = require('../assets/images/personagem/mouth/mouth_open.png');
const MOUTH_CLOSED = require('../assets/images/personagem/mouth/mouth_neutro.png');

const FOOD_SPRITES = [
  require('../assets/images/food/full_chicken.png'),
  require('../assets/images/food/first_bite_chicken.png'),
  require('../assets/images/food/second_bite_chicken.png'),
  require('../assets/images/food/finished_bite_chicken.png')
];

type Props = {
  token: string;
}

export default function HomeScreen({ token }: Props) {
  const [emotion, setEmotion] = useState<Emotion>('NEUTRO');
  const [loading, setLoading] = useState(true);

  // --- ESTADOS DA ANIMAÇÃO ---
  const [foodVisible, setFoodVisible] = useState(false);
  const [foodStage, setFoodStage] = useState(0);
  const [mouthOverride, setMouthOverride] = useState<any>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const [foodModalVisible, setFoodModalVisible] = useState(false);


  useEffect(() => {
    async function loadState() {
      try {
        const state = await fetchSliviState(token);
        setEmotion(state.emotion);
      } catch (err: any) {
        Alert.alert("Erro: ", err.message);
      } finally {
        setLoading(false);
      }
    }
    loadState();
  }, [token]);

  // Função de delay
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Lógica de comer
  const handleEat = async () => {
    if (isAnimating || foodStage >= 3) return;

    setIsAnimating(true);

    // 1. Abre a boca
    setMouthOverride(MOUTH_OPEN);
    await wait(300);

    // 2. Morde e troca a imagem da comida
    setMouthOverride(MOUTH_CLOSED);
    setFoodStage(prev => prev + 1);
    await wait(400);

    // 3. Finaliza a mordida
    setMouthOverride(null);

    if (foodStage + 1 === 3) {
      setEmotion('FELIZ');
      setFoodVisible(false);
    }

    setIsAnimating(false);
  };

  if (loading) return <ActivityIndicator size="large" />;

  <FoodModal
    visible={foodModalVisible}
    onClose={() => setFoodModalVisible(false)}
    onSelectFood={(food) => {
      setFoodModalVisible(false);
      startEatingAnimation(food); // você já tem isso
    }}
  />

  return (
    <View style={styles.roomWall}>
      {/* --- JANELA --- */}
      <View style={styles.windowWrapper}>
        <Image source={require('../assets/images/weather/rain_storm.png')} style={styles.skyBackground} resizeMode='stretch' />
        <View style={styles.weatherLayer}><RainAnimation /></View>
        <Image source={require('../assets/images/components/windows/normal_window_gameV2.png')} resizeMode='stretch' style={styles.windowFrameImage} />
      </View>

      {/* --- SLIVI --- */}
      <View style={styles.sliviArea}>
        <Slivi scale={1} emotion={emotion} mouthOverride={mouthOverride} />

        {/* --- COMIDA (Aparece ao lado dele) --- */}
        {foodVisible && (
          <TouchableOpacity
            onPress={handleEat}
            style={styles.foodTouch}
            disabled={isAnimating || foodStage === 3}
          >
            <Image
              source={FOOD_SPRITES[foodStage]}
              style={styles.foodImg}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* --- BOTÃO FLUTUANTE DE TESTE --- */}
      <TouchableOpacity
        style={styles.btnSpawn}
        onPress={() => setFoodModalVisible(true)}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Alimentar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  roomWall: {
    flex: 1,
    backgroundColor: "#F2E8C9",
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    height: '100%',
  },
  windowWrapper: {
    width: WINDOW_SIZE,
    height: WINDOW_SIZE,
    marginTop: 150,
    overflow: 'hidden',
    zIndex: 1,
    position: 'relative',
  },
  skyBackground: { width: '100%', height: '100%', position: 'absolute' },
  weatherLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1, opacity: 0.8 },
  windowFrameImage: { position: 'relative', width: '100%', height: '100%', zIndex: 10 },

  sliviArea: {
    position: 'absolute',
    bottom: 100,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%', // 👈 Adicionado para garantir que o absolute não quebre
  },

  // Estilos da Comida
  foodTouch: {
    position: 'absolute',
    right: 100, // Posiciona a coxinha à direita do Slivi
    top: 190,  // Ajuste conforme a altura da boca dele
    backgroundColor: 'transparent'
  },
  foodImg: {
    width: 140,
    height: 140,
  },

  // Botão de Spawn (Canto inferior direito)
  btnSpawn: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#E67E22',
    padding: 15,
    borderRadius: 30,
    zIndex: 9999, // 👈 Z-Index altíssimo
    elevation: 10,
  }
});
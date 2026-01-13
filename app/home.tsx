import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';

// --- IMPORTS DOS COMPONENTES ---
import RainAnimation from '@/components/RainAnimation';
import Slivi from '@/components/slivi';
import FoodModal from '@/src/components/foods/foodModal';

// --- IMPORTS DE SERVIÇOS E DADOS ---
import { FOOD_IMAGES } from '@/src/components/foods/foodMap';
import { feedSlivi } from '@/src/services/feedService'; // <--- 1. Importando o serviço
import { fetchSliviState } from '@/src/services/sliviService';
import { Emotion } from '@/src/types/emotions';

const { width } = Dimensions.get('window');
const WINDOW_SIZE = width * 0.6;

const MOUTH_OPEN = require('../assets/images/personagem/mouth/mouth_open.png');
const MOUTH_CLOSED = require('../assets/images/personagem/mouth/mouth_neutro.png');

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

  // --- ESTADOS PARA COMIDA E LÓGICA ---
  const [currentFoodKey, setCurrentFoodKey] = useState<string | null>(null);
  const [currentFoodId, setCurrentFoodId] = useState<number | null>(null); // <--- 2. Estado para o ID
  const [foodModalVisible, setFoodModalVisible] = useState(false);

  // Recupera sprites dinamicamente
  const currentSprites = currentFoodKey ? (FOOD_IMAGES as any)[currentFoodKey] : [];

  useEffect(() => {
    loadState();

    const intervalId = setInterval(() => {
      loadState();
    }, 60000);

    // 3. Função de limpeza: cancela o intervalo se o usuário sair da tela
    return () => clearInterval(intervalId);
  }, [token]);

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

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  function startEatingAnimation(food: any) {

    setCurrentFoodKey(food.image_key);
    setCurrentFoodId(food.id); // <--- 3. Salvamos o ID aqui para usar depois

    setFoodStage(0);
    setFoodVisible(true);
    setIsAnimating(false);
    setFoodModalVisible(false);
  }

  const handleEat = async () => {
    if (isAnimating) return;
    if (!currentSprites || currentSprites.length === 0) return;

    setIsAnimating(true);

    // Animação da boca abrindo
    setMouthOverride(MOUTH_OPEN);
    await wait(300);

    // Mordida
    setMouthOverride(MOUTH_CLOSED);
    const nextStage = foodStage + 1;
    setFoodStage(nextStage);
    await wait(400);

    // Boca volta ao normal
    setMouthOverride(null);

    // VERIFICA SE ACABOU A COMIDA
    if (nextStage >= currentSprites.length - 1) {
      // <--- 4. Chamada à API ao concluir
      if (currentFoodId) {
        try {
          await feedSlivi(currentFoodId); // Chama o serviço

          await loadState();

        } catch (error) {
          Alert.alert("Erro", "Não foi possível computar a alimentação.");
        }
      }

      setFoodVisible(false);
      setCurrentFoodKey(null);
      setCurrentFoodId(null);
    }

    setIsAnimating(false);
  };

  if (loading) return <ActivityIndicator size="large" />;

  return (
    <View style={styles.roomWall}>
      <View style={styles.headerComponent}>
        <TouchableOpacity
          style={styles.btnSpawn}
          onPress={() => setFoodModalVisible(true)}
        >
          <Image
            source={require('../assets/images/components/botoes/elemento-geladeira.png')}
            style={{ width: 75, height: 75 }} />
        </TouchableOpacity>
      </View>
      <View style={styles.windowWrapper}>
        <Image
          source={require('../assets/images/weather/rain_storm.png')}
          style={styles.skyBackground}
          resizeMode='stretch'
        />
        <View style={styles.weatherLayer}><RainAnimation /></View>
        <Image
          source={require('../assets/images/components/windows/normal_window_gameV2.png')}
          resizeMode='stretch'
          style={styles.windowFrameImage}
        />
      </View>

      <View style={styles.sliviArea}>
        <Slivi scale={1} emotion={emotion} mouthOverride={mouthOverride} />

        {foodVisible && currentSprites.length > 0 && (
          <TouchableOpacity
            onPress={handleEat}
            style={styles.foodTouch}
            disabled={isAnimating}
          >
            <Image
              source={currentSprites[foodStage]}
              style={styles.foodImg}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      </View>



      <FoodModal
        visible={foodModalVisible}
        onClose={() => setFoodModalVisible(false)}
        onSelectFood={(food) => startEatingAnimation(food)}
      />
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
    width: '100%',
  },

  foodTouch: {
    position: 'absolute',
    right: 100,
    top: 190,
    backgroundColor: 'transparent'
  },
  foodImg: {
    width: 140,
    height: 140,
  },

  headerComponent: {
    minHeight: 50,
    maxHeight: 50,
  },

  btnSpawn: {
    top: 60,
    padding: 5,
    zIndex: 9999,
  }
});
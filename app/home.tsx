import { useEffect, useRef, useState } from 'react';
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
import { syncUserLocation, WeatherState } from '@/src/api/weatherClient';
import { FOOD_IMAGES } from '@/src/components/foods/foodMap';
import { feedSlivi } from '@/src/services/feedService';
import { sleepSlivi, wakeSlivi } from '@/src/services/sleepServices';
import { fetchSliviState } from '@/src/services/sliviService';
import { Emotion } from '@/src/types/emotions';

const { width } = Dimensions.get('window');
const WINDOW_SIZE = width * 0.6;

const MOUTH_OPEN = require('../assets/images/personagem/mouth/mouth_open.png');
const MOUTH_CLOSED = require('../assets/images/personagem/mouth/mouth_neutro.png');

const LAMP_ON = require('../assets/images/components/botoes/luz-off.png');
const LAMP_OFF = require('../assets/images/components/botoes/luz-on.png');

const WEATHER_IMAGES = {
  sun: require('../assets/images/weather/clean_sky.png'),
  rain: require('../assets/images/weather/rain_storm.png'),
  cloudy: require('../assets/images/weather/rain_storm.png'),
  night: require('../assets/images/weather/night_sky.png')
};



type Props = {
  token: string;
  userId: number
}

export default function HomeScreen({ token, userId }: Props) {

  // --- ESTADOS DO JOGO ---
  const [emotion, setEmotion] = useState<Emotion>('NEUTRO');
  const [loading, setLoading] = useState(true);

  // --- ESTADOS DE CLIMA (NOVO) ---
  const [weather, setWeather] = useState<WeatherState>({
    condition: 'sun', // Padrão seguro
    temp: 25,
    is_day: true
  });

  // --- ESTADOS DE LUZ E SONO ---
  const [isLightOn, setIsLightOn] = useState(true);
  const [sleepState, setSleepState] = useState<Emotion>('DORMINDO')
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- ESTADOS DA ANIMAÇÃO ---
  const [foodVisible, setFoodVisible] = useState(false);
  const [foodStage, setFoodStage] = useState(0);
  const [mouthOverride, setMouthOverride] = useState<any>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // --- ESTADOS PARA COMIDA E LÓGICA ---
  const [currentFoodKey, setCurrentFoodKey] = useState<string | null>(null);
  const [currentFoodId, setCurrentFoodId] = useState<number | null>(null); // <--- 2. Estado para o ID
  const [foodModalVisible, setFoodModalVisible] = useState(false);

  // Define qual emoção será exibida: A do servidor ou a do ciclo de sono
  const displayEmotion = sleepState === 'DORMINDO' ? emotion : (sleepState as Emotion);

  // Recupera sprites dinamicamente
  const currentSprites = currentFoodKey ? (FOOD_IMAGES as any)[currentFoodKey] : [];

  useEffect(() => {
    loadGameData();

    const intervalId = setInterval(() => {
      loadState();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [token]);


  // Função Wrapper para carregar tudo (Slivi + Clima)
  async function loadGameData() {
    setLoading(true);
    await loadState(); // Carrega Slivi
    await loadWeather(); // Carrega Clima
    setLoading(false);
  }


  // --- FUNÇÃO PARA CARREGAR CLIMA ---
  async function loadWeather() {
    const weatherData = await syncUserLocation(userId || 1);

    if (weatherData) {
      setWeather(weatherData);
    }
  }

  // --- FUNÇÃO PARA CARREGAR OS STATUS DO SLIVI ---
  async function loadState() {
    try {
      const state = await fetchSliviState(token);
      setEmotion(state.emotion);
      console.log(state);

      if (state.isSleeping) {
        setIsLightOn(false);
        setSleepState('DORMINDO');
      } else {
        setIsLightOn(true);
        setSleepState(state.emotion);
        if (sleepTimerRef.current) {
          clearTimeout(sleepTimerRef.current);
          sleepTimerRef.current = null;
        }
      }

    } catch (err: any) {
      Alert.alert("Erro: ", err.message);
    } finally {
      setLoading(false);
    }
  }

  // --- LÓGICA DA LÂMPADA ---
  const toggleLight = async () => {
    if (isLightOn) {
      // APAGAR A LUZ
      setIsLightOn(false);
      setSleepState('SONOLENTO');

      sleepSlivi().catch(err => console.log("Erro ao enviar sleep:", err));

      // Calcula tempo aleatório entre 20s (20000ms) e 30s (30000ms)
      const timeToSleep = Math.floor(Math.random() * 10000) + 20000;

      // Inicia o timer para dormir profundamente
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);

      sleepTimerRef.current = setTimeout(() => {
        setSleepState('DORMINDO');
      }, timeToSleep);

    } else {

      // ACENDER A LUZ
      setIsLightOn(true);
      setSleepState(emotion);

      wakeSlivi().catch(err => console.log("Erro ao enviar wake:", err));

      // Cancela o timer de dormir se ele ainda estiver rodando
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
        sleepTimerRef.current = null;
      }
      // Opcional: Recarregar estado atualizado do servidor ao acordar
      loadState();
    }
  };

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

  // Seleciona a imagem de fundo com base no estado 'condition'
  // Fallback para 'sun' se algo der errado
  const currentBgImage = WEATHER_IMAGES[weather.condition] || WEATHER_IMAGES.sun;

  return (
    <View style={styles.roomWall}>
      {!isLightOn && (
        <View style={styles.darkOverlay} pointerEvents="none" />
      )}
      <View style={styles.headerComponent}>
        {isLightOn && (
          <TouchableOpacity
            style={styles.btnSpawn}
            onPress={() => setFoodModalVisible(true)}
          >
            <Image
              source={require('../assets/images/components/botoes/elemento-geladeira.png')}
              style={{ width: 65, height: 65 }}
            />
          </TouchableOpacity>
        )}
        {/* Botão Lâmpada */}
        <TouchableOpacity
          style={styles.btnLamp}
          onPress={toggleLight}
        >
          <Image
            // Use uma imagem para ON e outra para OFF se tiver, ou a mesma
            source={isLightOn ? LAMP_ON : LAMP_OFF}
            style={{ width: 65, height: 65 }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
      <View style={styles.windowWrapper}>
        <Image
          source={currentBgImage}
          style={styles.skyBackground}
          resizeMode='stretch'
        />
        {weather.condition === 'rain' && (
          <View style={styles.weatherLayer}>
            <RainAnimation />
          </View>
        )}
        <Image
          source={require('../assets/images/components/windows/normal_window_gameV2.png')}
          resizeMode='stretch'
          style={styles.windowFrameImage}
        />
      </View>

      <View style={styles.sliviArea}>
        <Slivi scale={1} emotion={emotion} eyeEmotion={sleepState} mouthOverride={mouthOverride} />

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
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'black',
    opacity: 0.65,
    zIndex: 20
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
    top: 40,
    right: 35,
    position: 'absolute',
    minHeight: 50,
    maxHeight: 50,
    width: '20%',
    display: 'flex',
    flexDirection: 'row',
    marginBottom: '30%',
  },
});
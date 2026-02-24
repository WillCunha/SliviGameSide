import { Audio } from 'expo-av'; // <--- IMPORT DO ÁUDIO
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// --- IMPORTS DOS COMPONENTES ---
import RainAnimation from '@/components/RainAnimation';
import Slivi from '@/components/slivi';
import FoodModal from '@/src/components/foods/foodModal';
import { router, useLocalSearchParams } from 'expo-router';

// --- IMPORTS DE SERVIÇOS E DADOS ---
import ClothesModal from '@/components/Modal/Clothes';
import Notification from '@/components/Modal/Notification';
import StatesModal from '@/components/Modal/States';
import { syncUserLocation, WeatherState } from '@/src/api/weatherClient';
import { CLOTHES_IMAGES } from '@/src/components/clothes/clothesMap';
import { FOOD_IMAGES } from '@/src/components/foods/foodMap';
import { feedSlivi } from '@/src/services/feedService';
import { fetchNotifications, SliviNotification } from '@/src/services/notificationService';
import { sleepSlivi, wakeSlivi } from '@/src/services/sleepServices';
import { fetchSliviState } from '@/src/services/sliviService';
import { generateSpeech } from '@/src/services/speechService';
import { Emotion } from '@/src/types/emotions';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const WINDOW_SIZE = width * 0.6;

const MOUTH_OPEN = require('../assets/images/personagem/mouth/mouth_open.png');
const MOUTH_CLOSED = require('../assets/images/personagem/mouth/mouth_neutro.png');

const LAMP_ON = require('../assets/images/components/botoes/luz-off.png');
const LAMP_OFF = require('../assets/images/components/botoes/luz-on.png');

const WEATHER_IMAGES = {
  sun: require('../assets/images/weather/city_sunny.png'),
  rain: require('../assets/images/weather/city_rain.png'),
  cloudy: require('../assets/images/weather/city_rain.png'),
  night: require('../assets/images/weather/city_night.png')
};

export default function HomeScreen() {

  const params = useLocalSearchParams();

  const token = typeof params.token === 'string' ? params.token : undefined;
  const userId = typeof params.userId === 'string' ? Number(params.userId) : undefined;

  // --- ESTADOS DO JOGO ---
  const [emotion, setEmotion] = useState<Emotion>('NEUTRO');
  const [loading, setLoading] = useState(true);

  // --- ESTADOS DE CLIMA ---
  const [weather, setWeather] = useState<WeatherState>({
    condition: 'sun',
    temp: 25,
    is_day: true
  });

  // --- ESTADOS DE LUZ E SONO ---
  const [isLightOn, setIsLightOn] = useState(true);
  const [sleepState, setSleepState] = useState<Emotion>('DORMINDO');
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- ESTADOS DA ANIMAÇÃO E COMIDA ---
  const [foodVisible, setFoodVisible] = useState(false);
  const [foodStage, setFoodStage] = useState(0);
  const [mouthOverride, setMouthOverride] = useState<any>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentFoodKey, setCurrentFoodKey] = useState<string | null>(null);
  const [currentFoodId, setCurrentFoodId] = useState<number | null>(null);
  const [foodModalVisible, setFoodModalVisible] = useState(false);
  const [clothesModalVisible, setClothesModalVisible] = useState(false);

  // --- ESTADO DE NOTIFICAÇÕES E STATUS ---
  const [notifications, setNotifications] = useState<SliviNotification[]>([]);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const [sliviStates, setSliviStates] = useState<{
    HUNGER: number; ENERGY: number; SLEEP: number; TEMPERATURE: number; FUN: number; BRAVO: number;
  } | null>(null);

  const [sliviClothing, setSliviClothing] = useState<Record<string, string> | null>(null);

  const [statesModalVisible, setStatesModalVisible] = useState(false);

  // --- NOVOS ESTADOS PARA FALA ---
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechText, setSpeechText] = useState("");
  const speechIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Limpa o som da memória quando desmontar
  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  const displayEmotion = sleepState === 'DORMINDO' ? emotion : (sleepState as Emotion);
  const currentSprites = currentFoodKey ? (FOOD_IMAGES as any)[currentFoodKey] : [];

  useEffect(() => {
    loadGameData();
    const intervalId = setInterval(() => { loadState(); }, 60000);
    return () => clearInterval(intervalId);
  }, [token]);

  useEffect(() => {
    if (token) checkNotificationsStatus();
  }, [token]);

  useEffect(() => {

    scheduleNextSpeech();

    return () => {
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
    };
  }, []);

  async function loadGameData() {
    setLoading(true);
    await loadState();
    await loadWeather();
    setLoading(false);
  }

  async function loadWeather() {
    const weatherData = await syncUserLocation(userId || 1);
    if (weatherData) setWeather(weatherData);
  }

  async function loadState() {
    if (!token) return;
    try {
      const state = await fetchSliviState(token);
      setEmotion(state.emotion);
      setSliviStates(state.states);
      if (state.clothing) {
        setSliviClothing(state.clothing);
      }

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
      console.log("Erro ao carregar estado: ", err.message);
    } finally {
      setLoading(false);
    }
  }

  // --- LÓGICA DE FALA (NOVO) ---

  function scheduleNextSpeech() {
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }

    // ⏱️ intervalo aleatório (ex: 25s a 70s)
    const min = 25000;
    const max = 70000;
    const randomDelay = Math.floor(Math.random() * (max - min)) + min;

    speechTimeoutRef.current = setTimeout(() => {
      // handleSliviSpeech();
    }, randomDelay);
  }


  const startTalkingAnimation = () => {
    let mouthIsOpen = false;
    speechIntervalRef.current = setInterval(() => {
      setMouthOverride(mouthIsOpen ? MOUTH_CLOSED : MOUTH_OPEN);
      mouthIsOpen = !mouthIsOpen;
    }, 180); // Alterna a cada 180ms para simular fala
  };

  const stopTalkingAnimation = () => {
    if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
    setMouthOverride(null);
  };

  async function handleSliviSpeech(textToSpeak: string = "Olá, estou aqui para te ajudar!") {
    if (isSpeaking) return; // 

    try {
      const response = await generateSpeech(textToSpeak);
      const { phrase, audio_url } = response;

      const fullAudioUrl = `https://wfsoft.com.br/wf-api/slivi-game/${audio_url}`;

      setSpeechText(phrase);

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: fullAudioUrl },
        { shouldPlay: true },
        (status: any) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsSpeaking(false);
            stopTalkingAnimation();
            scheduleNextSpeech()
          }
        }
      );

      setSound(newSound);
      setIsSpeaking(true);
      startTalkingAnimation();

    } catch (error) {
      console.error("Erro na fala:", error);
      setIsSpeaking(false);
      stopTalkingAnimation();
      Alert.alert("Ops!", "Não foi possível gerar a fala agora.");
    }
  }


  // --- LÓGICA DA LÂMPADA ---
  const toggleLight = async () => {
    if (isLightOn) {
      setIsLightOn(false);
      setSleepState('SONOLENTO');
      sleepSlivi().catch(err => console.log("Erro sleep:", err));

      const timeToSleep = Math.floor(Math.random() * 10000) + 20000;
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = setTimeout(() => { setSleepState('DORMINDO'); }, timeToSleep);
    } else {
      setIsLightOn(true);
      setSleepState(emotion);
      wakeSlivi().catch(err => console.log("Erro wake:", err));
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
        sleepTimerRef.current = null;
      }
      loadState();
    }
  };

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  function startEatingAnimation(food: any) {
    setCurrentFoodKey(food.image_key);
    setCurrentFoodId(food.id);
    setFoodStage(0);
    setFoodVisible(true);
    setIsAnimating(false);
    setFoodModalVisible(false);
  }

  const handleEat = async () => {
    if (isAnimating || isSpeaking) return; // Evita comer enquanto fala
    if (!currentSprites || currentSprites.length === 0) return;

    setIsAnimating(true);
    setMouthOverride(MOUTH_OPEN);
    await wait(300);
    setMouthOverride(MOUTH_CLOSED);

    const nextStage = foodStage + 1;
    setFoodStage(nextStage);
    await wait(400);
    setMouthOverride(null);

    if (nextStage >= currentSprites.length - 1) {
      if (currentFoodId) {
        try {
          await feedSlivi(currentFoodId);
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

  async function handleLogout() {
    Alert.alert('Sair', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('slivi_token');
            await AsyncStorage.removeItem('slivi_userId');
            router.replace('/');
          } catch (err) { console.error('Erro ao fazer logout:', err); }
        },
      },
    ]);
  }

  async function handleOpenNotifications() {
    setNotifModalVisible(true);
    setHasUnread(false);
    if (!token) return;
    setLoadingNotifs(true);
    try {
      const data = await fetchNotifications(token);
      setNotifications(data);
    } catch (error) { console.log("Erro ao buscar notificações:", error); }
    finally { setLoadingNotifs(false); }
  }

  const checkNotificationsStatus = async () => {
    try {
      const data = await fetchNotifications(token);
      const hasNew = data.some(n => n.is_read === 0);
      setHasUnread(hasNew);
      setNotifications(data);
    } catch (error) { console.log("Erro ao checar notificações:", error); }
  };

  const currentBgImage = WEATHER_IMAGES[weather.condition] || WEATHER_IMAGES.sun;

  // Pega os caminhos (ex: "/pants/...") do estado sliviClothing 
  // e busca a imagem correspondente no nosso dicionário CLOTHES_IMAGES.
  const resolvedClothingItems = sliviClothing
    ? Object.values(sliviClothing) // Pega apenas os valores: ["/jackets/...", "/pants/..."]
      .map(path => CLOTHES_IMAGES[path]) // Troca o texto pelo require da imagem
      .filter(Boolean) // Remove itens que retornem 'undefined' (caso a API mande uma roupa que você ainda não mapeou)
    : []; // Se sliviClothing for null, retorna um array vazio

  return (
    <View style={styles.roomWall}>
      {!isLightOn && <View style={styles.darkOverlay} pointerEvents="none" />}

      {/* --- HEADER (TOPO) --- */}
      <View style={styles.headerComponent}>
        <View style={styles.leftHeader}>
          {/* Status/User */}
          <TouchableOpacity onPress={() => setStatesModalVisible(true)} style={styles.iconButton}>
            <Ionicons name="stats-chart" size={26} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.rightHeader}>
          <TouchableOpacity onPress={toggleLight} style={styles.iconButton}>
            <Ionicons
              name={isLightOn ? "bulb" : "bulb-outline"}
              size={26}
              color={isLightOn ? "#e5ff00" : "#000"}
            />
          </TouchableOpacity>

          {/* Notificações */}
          <TouchableOpacity onPress={handleOpenNotifications} style={[styles.iconButton, styles.notificationBtn]}>
            <Ionicons name={hasUnread ? "notifications" : "notifications"} size={26} color={hasUnread ? "#FF9800" : "#000"} />
            {hasUnread && <View style={styles.badgeDot} />}
          </TouchableOpacity>

          {/* Sair/Engrenagem */}
          <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
            <Ionicons name="settings-sharp" size={26} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* --- CORPO (CENTRO) --- */}
      <View style={styles.windowWrapper}>
        <Image source={currentBgImage} style={styles.skyBackground} resizeMode='stretch' />
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
        {isSpeaking && (
          <View style={styles.speechBubbleContainer}>
            <View style={styles.speechBubble}>
              <Text style={styles.speechText}>{speechText}</Text>
            </View>
            <View style={styles.bubbleTail} />
          </View>
        )}

        {/* Sombreamento abaixo do Slivi */}
        <View style={styles.sliviShadow} />

        <Slivi
          scale={1}
          size={600}
          emotion={emotion}
          eyeEmotion={sleepState}
          mouthOverride={mouthOverride}
          clothingItems={resolvedClothingItems} 
        />

        {foodVisible && currentSprites.length > 0 && (
          <TouchableOpacity onPress={handleEat} style={styles.foodTouch} disabled={isAnimating}>
            <Image source={currentSprites[foodStage]} style={styles.foodImg} resizeMode="contain" />
          </TouchableOpacity>
        )}
      </View>

      {/* --- FOOTER (BARRA INFERIOR) --- */}

      <View style={styles.bottomNavBar}>
        {/* Botão Comida */}
        <TouchableOpacity onPress={() => {
          if (isLightOn) {
            setFoodModalVisible(true);
          }
        }} style={styles.bottomNavIcon}>
          <Ionicons name="restaurant" size={32} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => {
           setClothesModalVisible(true);
        }} style={styles.bottomNavIcon}>
          <MaterialCommunityIcons name="hanger" size={32} color="#000" />
        </TouchableOpacity>

        {/* Botão Jogar (CTA Principal) */}
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => {
            if (isLightOn) {
              router.push({
                pathname: './games/SliviPulse',
                params: { emotion: emotion }
              })
            }
          }
          }
        >
          <Text style={styles.playButtonText}>JOGAR{'\n'}SLIVI PULSE</Text>
        </TouchableOpacity>

        {/* Botão Chat (Teste de Fala) */}
        <TouchableOpacity onPress={() => {
          if (isLightOn) {
            handleSliviSpeech("Teste de fala do Slivi!")
          }
        }
        } style={styles.bottomNavIcon}>
          <Ionicons name="chatbubble-ellipses" size={32} color="#000" />
        </TouchableOpacity>
      </View>


      <FoodModal visible={foodModalVisible} onClose={() => setFoodModalVisible(false)} onSelectFood={(food) => startEatingAnimation(food)} />
      <ClothesModal visible={clothesModalVisible} onClose={() => setClothesModalVisible(false)} onSelectClothes={(food) => startEatingAnimation(food)} />
      {sliviStates && <StatesModal visible={statesModalVisible} onClose={() => setStatesModalVisible(false)} states={sliviStates} />}
      <Notification visible={notifModalVisible} onClose={() => setNotifModalVisible(false)} notifications={notifications} loading={loadingNotifs} />
    </View >
  );
}

const styles = StyleSheet.create({
  roomWall: {
    flex: 1,
    backgroundColor: "#EBE3CD", // Bege mais suave do mockup
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    height: '100%',
  },
  darkOverlay: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'black', opacity: 0.65, zIndex: 20
  },

  // --- HEADER STYLES ---
  headerComponent: {
    marginTop: 50, // Afasta do topo da tela (Status Bar)
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  leftHeader: {
    flexDirection: 'row',
  },
  rightHeader: {
    flexDirection: 'row',
    gap: 10, // Espaçamento entre os ícones da direita
  },
  iconButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBtn: { position: 'relative' },
  badgeDot: {
    position: 'absolute', top: -4, right: -4, width: 12, height: 12,
    borderRadius: 6, backgroundColor: 'red', borderWidth: 2, borderColor: '#EBE3CD',
  },

  // --- WINDOW & SLIVI STYLES ---
  windowWrapper: {
    width: WINDOW_SIZE, height: WINDOW_SIZE,
    marginTop: 40, // Espaço entre o header e a janela
    overflow: 'hidden',
    zIndex: 1,
    borderRadius: 20, // Cantos arredondados na janela
    borderWidth: 1,
    borderColor: '#000', // Moldura preta sólida
  },
  skyBackground: { width: '100%', height: '100%', position: 'absolute' },
  weatherLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1, opacity: 0.8 },
  windowFrameImage: { position: 'relative', width: '100%', height: '100%', zIndex: 10, opacity: 1 }, // Opacidade 0 caso a moldura real atrapalhe a borda preta sólida, ajuste se necessário

  sliviArea: {
    flex: 1,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: -20, // Puxa o Slivi um pouco para cima sobrepondo a janela
  },
  sliviShadow: {
    position: 'absolute',
    bottom: -400,
    width: '100%',
    height: 700,
    backgroundColor: 'rgba(0,0,0,0.15)',
    transform: [{ scaleY: 0.5 }], // Achata a bolinha para virar sombra
  },

  // --- SPEECH BUBBLE ---
  speechBubbleContainer: {
    position: 'absolute',
    top: -40,
    alignItems: 'center',
    zIndex: 100,
    width: '80%',
  },
  speechBubble: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000',
    width: '100%',
  },
  speechText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  bubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#000',
    marginTop: -1,
  },

  // --- FOOD STYLES ---
  foodTouch: { position: 'absolute', right: 100, zIndex: 20, bottom: 140, backgroundColor: 'transparent' },
  foodImg: { width: 140, height: 140, zIndex: 20 },

  // --- BOTTOM NAV BAR STYLES ---
  bottomNavBar: {
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 40, // Distância do fundo da tela
    zIndex: 10,
  },
  bottomNavIcon: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    width: 70,
    height: 70,
    marginHorizontal: 5,
  },
  playButton: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 15,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
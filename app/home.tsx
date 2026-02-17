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
import { useLocalSearchParams } from 'expo-router';

// --- IMPORTS DE SERVIÇOS E DADOS ---
import Notification from '@/components/Modal/Notification';
import StatesModal from '@/components/Modal/States';
import { syncUserLocation, WeatherState } from '@/src/api/weatherClient';
import { FOOD_IMAGES } from '@/src/components/foods/foodMap';
import { feedSlivi } from '@/src/services/feedService';
import { fetchNotifications, SliviNotification } from '@/src/services/notificationService';
import { sleepSlivi, wakeSlivi } from '@/src/services/sleepServices';
import { fetchSliviState } from '@/src/services/sliviService';
import { Emotion } from '@/src/types/emotions';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

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

  const token =
    typeof params.token === 'string'
      ? params.token
      : undefined;

  const userId =
    typeof params.userId === 'string'
      ? Number(params.userId)
      : undefined;

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

  // --- ESTADO DE NOTIFICAÇÕES ---
  const [notifications, setNotifications] = useState<SliviNotification[]>([]);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const [sliviStates, setSliviStates] = useState<{
    HUNGER: number;
    ENERGY: number;
    SLEEP: number;
    TEMPERATURE: number;
    FUN: number;
    BRAVO: number;
  } | null>(null);

  const [statesModalVisible, setStatesModalVisible] = useState(false);


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
    if (!token) return;
    try {
      const state = await fetchSliviState(token);

      setEmotion(state.emotion);
      setSliviStates(state.states); // 👈 AQUI

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

  async function handleLogout() {
    Alert.alert(
      'Sair',
      'Deseja realmente sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('slivi_token');
              await AsyncStorage.removeItem('slivi_userId');

              // Limpa toda a stack de navegação
              router.replace('/');
            } catch (err) {
              console.error('Erro ao fazer logout:', err);
            }
          },
        },
      ]
    );
  }

  async function handleOpenNotifications() {
    setNotifModalVisible(true);

    // Ao abrir, assumimos que o usuário "viu" as notificações
    // Visualmente, removemos o alerta imediatamente
    setHasUnread(false);

    // Opcional: Aqui futuramente você pode chamar uma API para marcar como lido no banco
    // await markAllAsRead(token); 

    if (!token) return;
    setLoadingNotifs(true);
    try {
      const data = await fetchNotifications(token);
      setNotifications(data);
    } catch (error) {
      console.log("Erro ao buscar notificações:", error);
    } finally {
      setLoadingNotifs(false);
    }
  }
  // Função auxiliar para verificar sem abrir o modal
  const checkNotificationsStatus = async () => {
    try {
      const data = await fetchNotifications(token);
      // Verifica se existe ALGUMA notificação onde is_read é 0 ou false
      const hasNew = data.some(n => n.is_read === 0);
      setHasUnread(hasNew);

      // Opcional: Já salva os dados para quando abrir não precisar carregar de novo
      setNotifications(data);
    } catch (error) {
      console.log("Erro ao checar notificações:", error);
    }
  };

  useEffect(() => {
    if (token) {
      checkNotificationsStatus();
    }
  }, [token]);

  // Seleciona a imagem de fundo com base no estado 'condition'
  // Fallback para 'sun' se algo der errado
  const currentBgImage = WEATHER_IMAGES[weather.condition] || WEATHER_IMAGES.sun;

  return (
    <View style={styles.roomWall}>
      {!isLightOn && (
        <View style={styles.darkOverlay} pointerEvents="none" />
      )}
      <View style={styles.headerComponent}>
        <View style={styles.leftHeader} >

          <TouchableOpacity
            onPress={() => setStatesModalVisible(true)}
          >
            <Ionicons name="stats-chart-outline" size={24} color="#474646" style={{ marginRight: '5%', marginLeft: '5%' }} />
          </TouchableOpacity>

          {isLightOn && (
            <TouchableOpacity
              onPress={() => setFoodModalVisible(true)}
            >
              <Ionicons name="restaurant-outline" size={24} color="#474646" />
            </TouchableOpacity>
          )}

        </View>
        <View style={styles.rightHeader} >
          {/* Botão Lâmpada */}
          <TouchableOpacity
            onPress={toggleLight}
          >
            <Image
              // Use uma imagem para ON e outra para OFF se tiver, ou a mesma
              source={isLightOn ? LAMP_ON : LAMP_OFF}
              style={{ width: 65, height: 65 }}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleOpenNotifications} style={styles.notificationBtn}>
            <Ionicons
              // Se tem não lida: Ícone preenchido ('notifications'). Senão: Outline.
              name={hasUnread ? "notifications" : "notifications-outline"}
              size={24}
              // Se tem não lida: Laranja (#FF9800). Senão: Cinza Escuro (#474646).
              color={hasUnread ? "#FF9800" : "#474646"}
            />

            {/* Opcional: Adiciona uma bolinha vermelha (Badge) para chamar mais atenção */}
            {hasUnread && <View style={styles.badgeDot} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="exit-outline" size={24} color="#474646" style={{ marginRight: '-10%', marginLeft: '20%' }} />
          </TouchableOpacity>
        </View>
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
        <Slivi scale={1} size={600} emotion={emotion} eyeEmotion={sleepState} mouthOverride={mouthOverride} />

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

        <TouchableOpacity onPress={() => router.push({
          pathname: './games/SliviPulse',
          params: {
            emotion: emotion,
          }
        })} >
          <Text>Jogar Slivi Pulse</Text>
        </TouchableOpacity>


      </View>



      <FoodModal
        visible={foodModalVisible}
        onClose={() => setFoodModalVisible(false)}
        onSelectFood={(food) => startEatingAnimation(food)}
      />

      {sliviStates && (
        <StatesModal
          visible={statesModalVisible}
          onClose={() => setStatesModalVisible(false)}
          states={sliviStates}
        />
      )}

      <Notification
        visible={notifModalVisible}
        onClose={() => setNotifModalVisible(false)}
        notifications={notifications}
        loading={loadingNotifs}
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
    bottom: 10,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },

  foodTouch: {
    position: 'absolute',
    right: 100,
    bottom: 140,
    backgroundColor: 'transparent'
  },
  foodImg: {
    width: 140,
    height: 140,
  },

  headerComponent: {
    top: 40,
    position: 'absolute',
    minHeight: 50,
    maxHeight: 50,
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    marginBottom: '30%',
    alignItems: 'center'
  },
  leftHeader: {
    width: '50%',
    position: 'absolute',
    left: 5,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',

  },
  rightHeader: {
    width: '50%',
    position: 'absolute',
    right: 0,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  logoutText: {
    color: '#ff4d4f',
    fontWeight: 'bold',
    fontSize: 16,
  },

  notificationBtn: {
    position: 'relative', // Necessário para o badge se posicionar
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeDot: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'red', // Bolinha vermelha de alerta
    borderWidth: 1,
    borderColor: '#fff',
  },
});
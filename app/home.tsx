import { Audio } from 'expo-av'; // <--- IMPORT DO ÁUDIO
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

// --- IMPORTS DE SERVIÇOS E DADOS ---
import AirTrafficAnimation from '@/components/AirTrafficAnimation';
import ClothesModal from '@/components/Modal/Clothes';
import Notification from '@/components/Modal/Notification';
import StatesModal from '@/components/Modal/States';
import WindowCleanerAnimation from '@/components/WindowCleanerAnimation';
import { syncUserLocation, WeatherState } from '@/src/api/weatherClient';
import { CLOTHES_IMAGES } from '@/src/components/clothes/clothesMap';
import { FOOD_IMAGES } from '@/src/components/foods/foodMap';
import { LOCAL_ASSETS } from '@/src/components/slivi/speechMap';
import { dressService } from '@/src/services/dressService';
import { feedSlivi } from '@/src/services/feedService';
import { fetchNotifications, SliviNotification } from '@/src/services/notificationService';
import { sleepSlivi, wakeSlivi } from '@/src/services/sleepServices';
import { fetchSliviState } from '@/src/services/sliviService';
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
  const isNewUser = params.isNewUser === 'true';

  // --- INICIALIZAÇÃO OTIMIZADA DOS PARAMS ---
  const parsedSliviState = params.initialSliviState ? JSON.parse(params.initialSliviState as string) : null;
  const initialIsSleeping = parsedSliviState?.isSleeping || false;

  // --- ESTADO DE NOTIFICAÇÕES E STATUS ---
  const [notifications, setNotifications] = useState<SliviNotification[]>([]);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [sliviStates, setSliviStates] = useState<{
    HUNGER: number; ENERGY: number; SLEEP: number; TEMPERATURE: number; FUN: number; BRAVO: number;
  } | null>(parsedSliviState ? parsedSliviState.states : null);


  // --- ESTADOS DO JOGO ---
  const [emotion, setEmotion] = useState<Emotion>('NEUTRO');
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState("");

  // --- ESTADOS DE CLIMA ---
  const [weather, setWeather] = useState<WeatherState>({
    condition: 'sun',
    temp: 25,
    is_day: true
  });

  // --- ESTADOS DE LUZ E SONO ---
  const [isLightOn, setIsLightOn] = useState(!initialIsSleeping);
  const [sleepState, setSleepState] = useState<Emotion>(initialIsSleeping);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A Ref é a fonte da verdade para o setTimeout conseguir checar se ele dormiu:
  const isSleepingRef = useRef(initialIsSleeping);

  // --- ESTADOS DA ANIMAÇÃO E COMIDA ---
  const [foodVisible, setFoodVisible] = useState(false);
  const [foodStage, setFoodStage] = useState(0);
  const [mouthOverride, setMouthOverride] = useState<any>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentFoodKey, setCurrentFoodKey] = useState<string | null>(null);
  const [currentFoodId, setCurrentFoodId] = useState<number | null>(null);
  const [foodModalVisible, setFoodModalVisible] = useState(false);

  // --- ESTADOS DE ROUPAS ---
  const [clothesModalVisible, setClothesModalVisible] = useState(false);
  const [sliviClothing, setSliviClothing] = useState<Record<string, string> | null>(null);
  const [statesModalVisible, setStatesModalVisible] = useState(false);

  // --- NOVOS ESTADOS PARA FALA ---
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechText, setSpeechText] = useState("");
  const speechIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCategoryRef = useRef<string | null>(null);
  const speechCountRef = useRef(0);
  const nextFourthWallRef = useRef(Math.floor(Math.random() * 10) + 25)

  // --- MENU BOTÃO DE GAMES ---
  const [menuOpen, setMenuOpen] = useState(false)

  // ... dentro do seu HomeScreen ...

  useFocusEffect(
    useCallback(() => {
      setLoadingMsg("Conectando ao servidor da WF...");
      let isActive = true;

      async function syncData() {
        if (!token) return;

        // 1. Bloqueia a tela imediatamente ao voltar para a Home
        setLoading(true);

        try {
          // 2. Chama a API da Hostinger
          await Promise.all([
            loadState(),
            loadWeather(),
            checkNotificationsStatus()
          ]);
        } catch (error) {
          setLoadingMsg("Houve um erro ao se conectar!");
          console.error("Erro ao sincronizar dados no retorno:", error);
        } finally {
          // 3. Só libera a tela quando o servidor responder
          if (isActive) setLoading(false);
        }
      }

      syncData();

      const intervalId = setInterval(() => { loadState(); }, 60000);

      return () => {
        isActive = false;
        clearInterval(intervalId);
      };
    }, [token])
  );

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

  useEffect(() => {
    if (!loading && isNewUser) {
      const welcomeTimer = setTimeout(() => {
        handleWelcomeSpeech();
      }, 1500);

      return () => clearTimeout(welcomeTimer);
    }
  }, [loading, isNewUser]);

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
        isSleepingRef.current = true;
      } else {
        setIsLightOn(true);
        setSleepState(state.emotion);
        isSleepingRef.current = false;
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

  function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function scheduleNextSpeech() {
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }

    // Se ele já estiver dormindo, aborta a programação
    if (isSleepingRef.current) return;

    const min = 40000;
    const max = 120000;
    const randomDelay = Math.floor(Math.random() * (max - min)) + min;
    console.log("tempo: ", randomDelay);


    speechTimeoutRef.current = setTimeout(() => {
      // Checa a Ref novamente na hora H para ter certeza de que a luz não foi apagada
      // enquanto o cronômetro estava rodando
      if (!isSleepingRef.current) {
        handleSliviSpeech();
      }
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

  // ... 
  async function handleWelcomeSpeech() {

    const dialog = [
      {
        text: "Oi… que bom que você chegou — obrigado por vir fazer companhia pra mim! Vamos começar uma jornada juntos?",
        audio: require('@/assets/audios/boasVindas/audio_01.mp3')
      },
      {
        text: "'Ó', já que você chegou agora, deixa eu te explicar... Nos tracinhos ( ☰ ) ali em cima, você vê o que eu estou sentindo. Se você clicar na lâmpada (💡) para apagar a luz, eu durmo, óbvio. E não me deixa peladinho, tem que me vestir (👚) também!",
        audio: require('@/assets/audios/boasVindas/audio_02.mp3')
      }
    ];

    for (let i = 0; i < dialog.length; i++) {

      await new Promise<void>((resolve) => {
        playSpeech(dialog[i].audio, dialog[i].text, resolve);
      });

      await sleep(2000);
    }

    scheduleNextSpeech();
  }

  async function playSpeech(audio: any, text: string, onFinish?: () => void) {
    if (isSpeaking) return;

    try {
      if(sound){
        await sound.unloadAsync();
        setSound(null)
      }
      setSpeechText(text);
      setIsSpeaking(true);
      startTalkingAnimation();

      const { sound: newSound } = await Audio.Sound.createAsync(
        audio,
        { shouldPlay: true },
        (status: any) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsSpeaking(false);
            stopTalkingAnimation();
            newSound.unloadAsync();

            if (onFinish) onFinish();
          }
        }
      );

      setSound(sound);

    } catch (error) {
      console.error("Erro na fala:", error);
      setIsSpeaking(false);
      stopTalkingAnimation();
    }
  }

  async function handleSliviSpeech(categoriaForcada: string | null = null, isUrgent = false) {
    if (isUrgent) {
      setIsSpeaking(false);
    }

    if (isSpeaking && !isUrgent) return;

    try {
      let categoriaSorteada = categoriaForcada;

      if (!categoriaSorteada) {
        speechCountRef.current++;

        // 🎭 Quarta parede controlada (raríssima)
        if (speechCountRef.current >= nextFourthWallRef.current) {
          categoriaSorteada = 'quartaParede';
          speechCountRef.current = 0;
          nextFourthWallRef.current = Math.floor(Math.random() * 10) + 25;
        } else {
          // Se sliviStates for null, assumimos falso para evitar o loop vazio
          const comFome = sliviStates ? sliviStates.HUNGER < 50 : false;
          const comSono = sliviStates ? (sliviStates.SLEEP < 30 || sliviStates.ENERGY < 30) : false;

          // Criamos uma "piscina" de opções base. Sempre tem chance de algo aleatório.
          let opcoesValidas = ['aleatorio', 'piadas'];

          // Se tiver condição especial, adicionamos na piscina (aumentando a chance)
          if (comFome) {
            opcoesValidas.push('fome', 'fome'); // Peso duplo para fome
          }
          if (comSono) {
            opcoesValidas.push('sono', 'sono'); // Peso duplo para sono
          }

          // 5% de chance de espirrar
          if (Math.random() < 0.05) {
            opcoesValidas.push('espirro');
          }

          // 🔥 O SEGREDO ANTI-REPETIÇÃO: removemos a última categoria dita da piscina
          opcoesValidas = opcoesValidas.filter(categoria => categoria !== lastCategoryRef.current);

          // Fallback de segurança: se por acaso a piscina esvaziar, joga um aleatório
          if (opcoesValidas.length === 0) {
            opcoesValidas = ['aleatorio'];
          }

          // Sorteia uma categoria aleatória de dentro da nossa piscina validada
          const randomIndex = Math.floor(Math.random() * opcoesValidas.length);
          categoriaSorteada = opcoesValidas[randomIndex];
        }

        console.log("categoria sorteada:", categoriaSorteada);
      }

      // Salva a categoria para não repeti-la na próxima vez
      lastCategoryRef.current = categoriaSorteada;

      // Se por algum motivo bizarro ainda não tiver categoria ou não existir no map, reagenda e sai
      if (!categoriaSorteada || !LOCAL_ASSETS[categoriaSorteada]) {
        console.log("Categoria não definida ou inválida, reagendando fala...");
        scheduleNextSpeech();
        return;
      }

      // Sorteio do áudio e texto dentro da categoria escolhida
      const randomAudioIndex = Math.floor(
        Math.random() * LOCAL_ASSETS[categoriaSorteada].audios.length
      );

      const selectedAudio = LOCAL_ASSETS[categoriaSorteada].audios[randomAudioIndex];
      const selectedText = LOCAL_ASSETS[categoriaSorteada].textos[randomAudioIndex];

      if (!selectedAudio || !selectedText) {
        // Prevenção extra caso o array de textos/áudios tenha tamanhos diferentes ou algo falhe
        scheduleNextSpeech();
        return;
      }

      playSpeech(selectedAudio, selectedText, () => {
        scheduleNextSpeech();

      });

    } catch (error) {
      console.error("Erro na fala do Slivi:", error);
      setIsSpeaking(false);
    }
  }


  // --- LÓGICA DA LÂMPADA ---
  const toggleLight = async () => {
    if (isLightOn) {
      setIsLightOn(false);
      isSleepingRef.current = true;
      setSleepState('SONOLENTO');
      sleepSlivi().catch(err => console.log("Erro sleep:", err));

      const timeToSleep = Math.floor(Math.random() * 10000) + 20000;
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = setTimeout(() => { setSleepState('DORMINDO'); }, timeToSleep);
    } else {
      setIsLightOn(true);
      setSleepState(emotion);
      isSleepingRef.current = false;
      wakeSlivi().catch(err => console.log("Erro wake:", err));
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
        sleepTimerRef.current = null;
      }
      loadState();

      if (sliviStates && (sliviStates.SLEEP > 50 || sliviStates.ENERGY > 50)) {
        handleSliviSpeech('aoAcordar', true);
      }
    }
  };

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  function startEatingAnimation(food: any) {
     setIsSpeaking(false);
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

          handleSliviSpeech('fimComer', true);
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


  const handleSelectClothing = async (clothingItem: any, category: string) => {
    setClothesModalVisible(false);

    const isAlreadyWearing = sliviClothing[category] === clothingItem.slug;

    // Decide a ação ANTES de mandar pro servidor
    const actionToDo = isAlreadyWearing ? 'REMOVE' : 'EQUIP';

    // 1. Atualiza a tela na hora (Otimista)
    setSliviClothing(prev => ({
      ...prev,
      [category]: isAlreadyWearing ? null : clothingItem.slug
    }));

    try {
      await dressService(clothingItem.slug, actionToDo);
    } catch (error) {
      console.error("Erro ao processar troca de roupa:", error);
      Alert.alert("Erro", "Não foi possível atualizar o visual.");
      loadState();
    }

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
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>{loadingMsg}</Text>
        </View>
      )}
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
            <Ionicons name="exit" size={26} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* --- CORPO (CENTRO) --- */}
      <View style={styles.windowWrapper}>
        <Image source={currentBgImage} style={styles.skyBackground} resizeMode='stretch' />
        <AirTrafficAnimation />
        <WindowCleanerAnimation
          weatherCondition={weather.condition}
          windowSize={WINDOW_SIZE}
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
          if (isLightOn) {
            setClothesModalVisible(true);
          }
        }} style={styles.bottomNavIcon}>
          <MaterialCommunityIcons name="tshirt-v" size={32} color="#000" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>

          {/* MENU DROPDOWN (abre pra cima) */}
          {menuOpen && (
            <View style={styles.dropdownMenu}>
              <TouchableOpacity style={styles.dropdownItem}
                onPress={() => {
                  router.push({
                    pathname: './games/SliviPulse',
                    params: { emotion: emotion }
                  })
                }}>
                <Text style={{ textAlign: 'center', color: '#000', fontWeight: '800' }}>Slivi Pulse</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dropdownItem}
                onPress={() => {
                  router.push({
                    pathname: './games/SliviMaestro',
                    params: { emotion: emotion }
                  })
                }}>
                <Text style={{ textAlign: 'center', color: '#000', fontWeight: '800' }}>Slivi River</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dropdownItem}
                onPress={() => {
                  // router.push({
                  //   pathname: './games/GameQuiz/GameMenuScreen',
                  //   params: { emotion: emotion }
                  // })
                  router.push({
                    pathname: "/games/ItemUnlocked",
                    params: { clothId: '7' } // Enviamos o ID para a nova tela
                  });
                  // router.replace({
                  //   pathname: '/games/GameQuiz/GameOverScreen',
                  //   params: { 
                  //     roomId: 3,
                  //     userId: 1,
                  //     score: 180,
                  //     opponentScore: 150
                  //   }
                  // });
                }}>
                <Text style={{ textAlign: 'center', color: '#000', fontWeight: '800' }}>Slivi Quiz</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* BOTÃO PRINCIPAL */}
          <TouchableOpacity
            style={styles.bottomNavIcon}
            onPress={() => { if (isLightOn) { setMenuOpen(prev => !prev) } }}
          >
            <Ionicons name="game-controller-sharp" size={32} color="#000" />
          </TouchableOpacity>

        </View>


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
      <ClothesModal visible={clothesModalVisible} onClose={() => setClothesModalVisible(false)} onSelectClothes={handleSelectClothing} />
      {sliviStates && <StatesModal visible={statesModalVisible} onClose={() => setStatesModalVisible(false)} states={sliviStates} emotion={emotion} />}
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, // Cobre a tela inteira
    backgroundColor: '#EBE3CD', // Mesma cor de fundo da sua Home
    zIndex: 9999, // Fica por cima de TUDO
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
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
  foodTouch: { position: 'absolute', right: 100, zIndex: 20, bottom: 110, backgroundColor: 'transparent' },
  foodImg: { width: 140, height: 140, zIndex: 20 },

  // --- BOTTOM NAV BAR STYLES ---
  bottomNavBar: {
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 40,
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
  dropdownMenu: {
    position: 'absolute',
    bottom: 80, // 🔥 altura do botão (70) + margem
    alignItems: 'center',
    gap: 5,
  },

  dropdownItem: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 15,
    padding: 15,
    width: 70,
    height: 70,
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
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
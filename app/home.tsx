import { Audio } from 'expo-av';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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

// --- IMPORTS DE SERVIÇOS E DADOS ---
import AirTrafficAnimation from '@/components/AirTrafficAnimation';
import ClothesModal from '@/components/Modal/Clothes';
import Notification from '@/components/Modal/Notification';
import StatesModal from '@/components/Modal/States';
import WindowCleanerAnimation from '@/components/WindowCleanerAnimation';
import ZzzAnimation from '@/components/ZzzAnimation';
import { syncUserLocation, WeatherState } from '@/src/api/weatherClient';
import { CITY_SOUNDS } from '@/src/components/city/city';
import { CLOTHES_IMAGES } from '@/src/components/clothes/clothesMap';
import { REWARDS_IMAGES } from '@/src/components/rewards/rewardsMap';
import { LOCAL_ASSETS } from '@/src/components/slivi/speechMap';
import { dressService } from '@/src/services/dressService';
import { feedSlivi } from '@/src/services/feedService';
import { fetchNotifications, SliviNotification } from '@/src/services/notificationService';
import { sleepSlivi, wakeSlivi } from '@/src/services/sleepServices';
import { fetchSliviState } from '@/src/services/sliviService';
import { Emotion } from '@/src/types/emotions';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import PhoneMinigame from './games/PhoneMinigame';

const { width } = Dimensions.get('window');
const WINDOW_SIZE = width * 0.6;

const MOUTH_OPEN = require('../assets/images/personagem/mouth/mouth_open.png');
const MOUTH_CLOSED = require('../assets/images/personagem/mouth/mouth_neutro.png');

const PLATE_IMAGES = {
  GREEN: [
    require('@/assets/images/food/plate/plate_full_green.png'),
    require('@/assets/images/food/plate/plate_medium_green.png'),
    require('@/assets/images/food/plate/plate_finishing_green.png'),
  ],
  RED: [
    require('@/assets/images/food/plate/plate_full_red.png'),
    require('@/assets/images/food/plate/plate_medium_red.png'),
    require('@/assets/images/food/plate/plate_finishing_red.png'),
  ]
};


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
  const {unlockEvent} = useLocalSearchParams();

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
  const [money, setMoney] = useState(parsedSliviState ? parsedSliviState.wallet : null);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [isGameActive, setIsGameActive] = useState(false);
  const [isPlayingMinigame, setIsPlayingMinigame] = useState(false);

  // --- ESTADOS DE CLIMA ---
  const [weather, setWeather] = useState<WeatherState>({
    condition: 'sun',
    temp: 25,
    is_day: true,
    hour: 12
  });

  // --- ESTADOS DE LUZ E SONO ---
  const [isLightOn, setIsLightOn] = useState(!initialIsSleeping);
  const [sleepState, setSleepState] = useState<Emotion>(initialIsSleeping);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A Ref é a fonte da verdade para o setTimeout conseguir checar se ele dormiu:
  const isSleepingRef = useRef(initialIsSleeping);
  const displayEmotion = sleepState === 'DORMINDO' ? emotion : (sleepState as Emotion);

  // --- ESTADOS DA ANIMAÇÃO E COMIDA ---
  const [currentPlateFoods, setCurrentPlateFoods] = useState<any[]>([]);
  const plateRotation = useRef(new Animated.Value(0)).current;
  const plateOpacity = useRef(new Animated.Value(0)).current;
  const [plateColor, setPlateColor] = useState<'RED' | 'GREEN' | null>(null);
  const [foodVisible, setFoodVisible] = useState(false);
  const [foodStage, setFoodStage] = useState(0);
  const [mouthOverride, setMouthOverride] = useState<any>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [foodModalVisible, setFoodModalVisible] = useState(false);
  const currentSprites = plateColor ? PLATE_IMAGES[plateColor] : [];

  // --- ESTADOS DE RECOMPENSA (COMBO) ---
  const [rewardWord, setRewardWord] = useState<string | null>(null);
  const rewardScale = useRef(new Animated.Value(0)).current;

  // --- TEXTO FLUTUANTE ---
  const [currentFoodHunger, setCurrentFoodHunger] = useState<number | null>(null);
  const [showFloatingText, setShowFloatingText] = useState(false);
  const floatAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // --- ESTADOS DE ROUPAS ---
  const [clothesModalVisible, setClothesModalVisible] = useState(false);
  const [sliviClothing, setSliviClothing] = useState<Record<string, string> | null>(null);
  const [statesModalVisible, setStatesModalVisible] = useState(false);

  // --- ESTADOS PARA FALA ---
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechText, setSpeechText] = useState("");
  const speechIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCategoryRef = useRef<string | null>(null);
  const speechCountRef = useRef(0);
  const nextFourthWallRef = useRef(Math.floor(Math.random() * 10) + 25)

  // --- AUDIOS AMBIENTE ---
  const [ambientSound, setAmbientSound] = useState<Audio.Sound | null>(null);
  const sfxTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- MENU BOTÃO DE GAMES ---
  const [menuOpen, setMenuOpen] = useState(false);

  // --- ESTADOS DE XP E NÍVEL ---
  const [xpData, setXpData] = useState<{ currentXP: number, currentLevel: number, next_level_xp: number } | null>(
    parsedSliviState?.xpLevel || null
  );
  const [showXpBar, setShowXpBar] = useState(false);
  const xpBarOpacity = useRef(new Animated.Value(0)).current;
  const xpProgress = useRef(new Animated.Value(parsedSliviState?.xpLevel?.currentXP || 0)).current;

  // --- ESTADOS DE MUDANÇA DE HUMOR ---
  const prevEmotionRef = useRef<Emotion | null>(null);
  const moodTranslateY = useRef(new Animated.Value(0)).current;
  const [visualEmotion, setVisualEmotion] = useState<Emotion>(emotion);

  // --- ESTADO DE RELAÇÃO ---
  const [relationship, setRelationship] = useState<{
    affection_points: number; relation_level: number; level_name: string;
  } | null>(parsedSliviState ? parsedSliviState.relationship : null);
  const [showRelationTooltip, setShowRelationTooltip] = useState(false);
  const relationTooltipOpacity = useRef(new Animated.Value(0)).current;

  // Função para interpolar o valor de XP em Porcentagem (0% a 100%)
  const progressWidth = xpProgress.interpolate({
    inputRange: [0, xpData?.next_level_xp || 1], // Evita travar caso o next_level venha zerado
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  useFocusEffect(
    useCallback(() => {
      setLoadingMsg("Conectando ao servidor da WF...");
      let isActive = true;

      async function syncData() {
        if (!token) return;

        // 1. Bloqueia a tela imediatamente ao voltar para a Home
        setLoading(true);
        console.log("sleep? ", sleepState)

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


  // Controla o tempo de atualização de dados.
  useEffect(() => {
    loadGameData();
    const intervalId = setInterval(() => { loadState(); }, 60000);
    return () => clearInterval(intervalId);
  }, [token]);

  // Controla as falas de conquistas.
  useEffect(() => {
    if (unlockEvent) {
      const timer = setTimeout(() => {
        if (unlockEvent === 'item') {
          handleSliviSpeech('comemoraItem', true); 
        } else if (unlockEvent === 'seal') {
          handleSliviSpeech('conquistaSelo', true); 
        }
      }, 2000);

      // Limpa o parâmetro da rota imediatamente para que, 
      // se a tela re-renderizar, ele não repita a comemoração.
      router.setParams({ unlockEvent: undefined });

      return () => clearTimeout(timer);
    }
  }, [unlockEvent]);

  // Checa as notificações
  useEffect(() => {
    if (token) checkNotificationsStatus();
  }, [token]);

  // Controla e dispara as falas
  useEffect(() => {

    scheduleNextSpeech();

    return () => {
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
    };
  }, []);

  // Verifica se o usuario que chegou na tela veio de 'Register'
  useEffect(() => {
    if (!loading && isNewUser) {
      const welcomeTimer = setTimeout(() => {
        handleWelcomeSpeech();
      }, 1500);

      return () => clearTimeout(welcomeTimer);
    }
  }, [loading, isNewUser]);

  // Controla os sons ambiente. 
  useEffect(() => {
    let currentAmbientSound: Audio.Sound | null = null;
    let isActive = true;

    // 1. CONFIGURAÇÃO DA TRILHA BASE (LOOP) ---
    async function setupBaseAudio() {
      if (ambientSound) {
        await ambientSound.unloadAsync();
        setAmbientSound(null);
      }

      let baseAsset = null;
      let volume = 0.5;

      if (weather.condition === 'rain') {
        const isHeavyRain = Math.random() > 0.5;
        baseAsset = isHeavyRain
          ? require('@/assets/audios/effects/weather/rainy/heavy_rain.mp3')
          : require('@/assets/audios/effects/weather/rainy/soft_rain.mp3');
      } else {
        // Se não estiver chovendo, toca o ambiente urbano de fundo
        baseAsset = CITY_SOUNDS.ambiente.audios[0];
        volume = 0.1; // Mais baixo para não incomodar
      }

      try {
        const { sound: newSound } = await Audio.Sound.createAsync(baseAsset, {
          shouldPlay: true,
          isLooping: true,
          volume: volume,
        });
        if (isActive) {
          currentAmbientSound = newSound;
          setAmbientSound(newSound);
        } else {
          newSound.unloadAsync();
        }
      } catch (error) {
        console.error("Erro ao reproduzir som base:", error);
      }
    }

    // --- 2. GERENCIADOR DE EFEITOS ESPECIAIS (SFX) ---
    function scheduleNextSFX() {
      if (!isActive) return;

      const hour = weather.hour;
      const isRain = weather.condition === 'rain';

      // Configurações padrão de probabilidade e tempo
      let minDelay = 10000;
      let maxDelay = 30000;
      let possibleSounds: string[] = [];

      // Lógica de Horários e Clima
      if (hour >= 6 && hour < 9) {
        // Manhã: pássaros + trânsito leve
        possibleSounds = ['birds', 'birds', 'cars'];
        minDelay = 5000; maxDelay = 20000;
      } else if (hour >= 9 && hour < 19) {
        // Dia Ativo: muito trânsito, buzinas, sirenes
        possibleSounds = ['cars', 'cars', 'cars', 'ambulance', 'police', 'fire_truck'];
        minDelay = 3000; maxDelay = 15000;
      } else {
        // Noite: quase nada de buzinas
        possibleSounds = ['cars'];
        minDelay = 20000; maxDelay = 60000;
      }

      // Modificadores de Clima
      if (isRain) {
        // Chuva espanta os pássaros e diminui buzinas, mas pode ter trovão
        possibleSounds = possibleSounds.filter(s => s !== 'birds');
        possibleSounds.push('thunder');
        // Aumenta o intervalo entre sons na chuva
        minDelay *= 1.5;
        maxDelay *= 1.5;
      }

      // Se a piscina de sons ficar vazia por algum motivo, tenta de novo mais tarde
      if (possibleSounds.length === 0) {
        sfxTimeoutRef.current = setTimeout(scheduleNextSFX, 10000);
        return;
      }

      const delay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;

      sfxTimeoutRef.current = setTimeout(async () => {
        if (!isActive) return;

        const randomCategory = possibleSounds[Math.floor(Math.random() * possibleSounds.length)];

        // Verifica se a categoria existe no city.ts (evita crash se você ainda não adicionou birds/thunder)
        const categoryData = (CITY_SOUNDS as any)[randomCategory];

        if (categoryData && categoryData.audios.length > 0) {
          const randomAudio = categoryData.audios[Math.floor(Math.random() * categoryData.audios.length)];

          try {
            const asset = Asset.fromModule(randomAudio);
            await asset.downloadAsync();
            const { sound: sfxSound } = await Audio.Sound.createAsync(
              { uri: asset.localUri || asset.uri },
              { shouldPlay: true, volume: 0.1 }
            );

            sfxSound.setOnPlaybackStatusUpdate(async (status) => {
              if (status.isLoaded && status.didJustFinish) {
                await sfxSound.unloadAsync();
              }
            });
          } catch (error) {
            console.error(`Erro ao tocar SFX:`, error);
          }
        }


        scheduleNextSFX();
      }, delay);
    }

    setupBaseAudio();
    scheduleNextSFX();

    // --- 3. CLEANUP (Desmontagem) ---
    return () => {
      isActive = false;
      if (currentAmbientSound) {
        currentAmbientSound.unloadAsync();
      }
      if (sfxTimeoutRef.current) {
        clearTimeout(sfxTimeoutRef.current);
      }
    };
  }, [weather.condition]); // Reexecuta se o clima mudar 

  // Verifica o status 'emotion' que vem da API
  useEffect(() => {
    if (prevEmotionRef.current && prevEmotionRef.current !== emotion) {
      if (!isSleepingRef.current) {
        triggerMoodChange(emotion); // Passa a nova emoção para a função
      }
    }
    prevEmotionRef.current = emotion;
  }, [emotion]);

  // --- CHAMA AS FUNÇÕES DE ATUALIZAÇÃO DE DADOS ---
  async function loadGameData() {
    setLoading(true);
    await loadState();
    await loadWeather();
    setLoading(false);
  }

  // --- CARREGA DADOS DO GAME ---
  async function loadState(): Promise<any> {
    if (!token) return;
    try {
      const state = await fetchSliviState(token);
      console.log(displayEmotion)


      if (!state) {
        console.log("caiu aqui: fetchSliviState não retornou dados!")
        return;
      }

      setEmotion(state.emotion);
      setSliviStates(state.states);
      setRelationship(state.relationship);

      if (state.clothing) {
        setSliviClothing(state.clothing);
      }

      if (state.xpLevel) {
        setXpData(state.xpLevel);
        // Atualiza a barra "silenciosamente" se ela não estiver animando
        if (!showXpBar) {
          xpProgress.setValue(state.xpLevel.currentXP);
        }
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

      return state;
    } catch (err: any) {
      console.log("Erro ao carregar estado: ", err.message);
    } finally {
      setLoading(false);
    }
  }

  // --- CARREGA DADOS DO TEMPO NO LOCAL ---
  async function loadWeather() {
    const weatherData = await syncUserLocation(userId || 1);
    if (weatherData) setWeather(weatherData);
  }

  // --- SEQUÊNCIA DE LÓGICAS DE FALA ---
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
    //console.log("tempo: ", randomDelay);


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

  // --- (BOAS VINDAS) ---
  async function handleWelcomeSpeech() {

    const dialog = [
      {
        text: "Oi… que bom que você chegou — obrigado por vir fazer companhia pra mim! Vamos começar uma jornada juntos?",
        audio: require('@/assets/audios/speechs/boasVindas/audio_01.mp3')
      },
      {
        text: "'Ó', já que você chegou agora, deixa eu te explicar... Nos tracinhos ( ☰ ) ali em cima, você vê o que eu estou sentindo. Se você clicar na lâmpada (💡) para apagar a luz, eu durmo, óbvio. E não me deixa peladinho, tem que me vestir (👚) também!",
        audio: require('@/assets/audios/speechs/boasVindas/audio_02.mp3')
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
      if (sound) {
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
      // 1. Atualização Otimista (Front-end)
      setIsLightOn(false);
      isSleepingRef.current = true;
      setSleepState('SONOLENTO');

      const timeToSleep = Math.floor(Math.random() * 10000) + 20000;
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = setTimeout(() => { setSleepState('DORMINDO'); }, timeToSleep);

      // 2. Aguarda o back-end processar
      try {
        await sleepSlivi();
      } catch (err) {
        console.log("Erro sleep:", err);
      }

    } else {
      // 1. Atualização Otimista (Front-end)
      setIsLightOn(true);
      setSleepState(emotion);
      isSleepingRef.current = false;

      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
        sleepTimerRef.current = null;
      }

      // 2. Sincronização segura com o back-end
      try {
        // Primeiro garantimos que o back-end registrou que ele acordou
        await wakeSlivi();

        // SÓ ENTÃO puxamos o estado novo (evitando a lâmpada piscar)
        await loadState();
      } catch (err) {
        console.log("Erro wake:", err);
      }

      // 3. Verifica se ele precisa falar algo
      if (sliviStates && (sliviStates.SLEEP > 50 || sliviStates.ENERGY > 50)) {
        handleSliviSpeech('aoAcordar', true);
      }
    }
  };

  // --- LÓGICA DE RECOMPENSA POR ALIMENTAR-SE
  const triggerRewardAnimation = async (word: string) => {
    try {
      const moodAssetReward = Asset.fromModule(require('@/assets/audios/effects/conquista/epic_food_reward_02.mp3'));
      await moodAssetReward.downloadAsync();
      const { sound: rewardSound } = await Audio.Sound.createAsync(
        { uri: moodAssetReward.localUri || moodAssetReward.uri },
        { shouldPlay: true, volume: 1.0 }
      );
      rewardSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) rewardSound.unloadAsync();
      });
    } catch (err) {
      console.log("Erro ao tocar som de recompensa:", err);
    }

    setRewardWord(word.toUpperCase());

    Animated.spring(rewardScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();

    await wait(2500);

    Animated.timing(rewardScale, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setRewardWord(null);
      handleSliviSpeech('fimComer', true);
    });
  };


  // --- LÓGICA DE ALIMENTAR-SE  ---
  const processFeeding = async (foodsArray: any[]) => {
    if (isAnimating || isSpeaking || !foodsArray || foodsArray.length === 0) {
      console.log("Bloqueado: Animando, Falando ou sem comida.");
      return;
    }

    let meatCount = 0;
    let vegCount = 0;
    let totalHunger = 0;

    foodsArray.forEach(food => {
      totalHunger += (food.hunger || 0);
      if (food.type?.toUpperCase() === 'MEAT') {
        meatCount++;
      } else {
        vegCount++;
      }
    });

    const decidedColor = meatCount > vegCount ? 'RED' : 'GREEN';
    const spritesParaAnimar = PLATE_IMAGES[decidedColor];

    setIsAnimating(true);
    setIsSpeaking(false);
    setFoodModalVisible(false);

    setPlateColor(decidedColor);
    setCurrentPlateFoods(foodsArray);
    setCurrentFoodHunger(totalHunger);
    setFoodStage(0);
    setFoodVisible(true);

    plateRotation.setValue(0);

    Animated.timing(plateOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    await wait(500);

    const totalBites = spritesParaAnimar.length;

    for (let bite = 0; bite < totalBites; bite++) {

      setMouthOverride(MOUTH_OPEN);
      await wait(200);

      Animated.timing(plateRotation, {
        toValue: 90, duration: 350, useNativeDriver: true
      }).start();
      await wait(350);
      setFoodStage(bite + 1);

      Animated.timing(plateRotation, {
        toValue: 0, duration: 350, useNativeDriver: true
      }).start();
      await wait(150);
      setMouthOverride(MOUTH_CLOSED);

      await wait(200);
      setMouthOverride(null);

      if (bite < totalBites - 1) {
        await wait(400);
      }
    }


    Animated.timing(plateOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    await wait(300);
    setFoodVisible(false);

    try {
      const previousXp = xpData?.currentXP || 0;
      let obtainedCombo: string | null = null;

      const idsToSend = foodsArray.map(food => food.id);
      console.log("Enviando array de IDs para a API: ", idsToSend);

      // 2. Fazemos apenas UMA requisição enviando o array [id, id, id]
      const response = await feedSlivi(idsToSend);
      console.log("RESPOSTA ", response);

      // 3. Verificamos se a refeição gerou um combo
      if (response && response.combo_word) {
        obtainedCombo = response.combo_word;
      }

      const newState = await loadState();
      if (newState && newState.xpLevel) {
        const newXp = newState.xpLevel.currentXP;
        if (newXp > previousXp) {
          triggerXpBarAnimation(previousXp, newXp);
        }
      }

      triggerFloatingText();

      // Controle da fala e recompensa
      if (obtainedCombo) {
        // Se teve combo, a animação assume o controle e o Slivi só fala no final dela
        triggerRewardAnimation(obtainedCombo);
      } else if (response.sick_message === 200) {
        handleSliviSpeech('fimComerEnjoado', true);
      } else {
        handleSliviSpeech('fimComer', true);
      }

    } catch (error) {
      Alert.alert("Erro", "Não foi possível computar a alimentação.");
      console.error(error);
    }

    // Limpeza
    setPlateColor(null);
    setCurrentPlateFoods([]);
    setIsAnimating(false);
  };


  // --- TEXTO DE PONTUAÇÃO FLUTUANTE ---
  const triggerFloatingText = () => {
    setShowFloatingText(true);
    floatAnim.setValue(0);
    opacityAnim.setValue(1);

    Animated.parallel([
      Animated.timing(floatAnim, {
        toValue: -150, // Sobe 150 pixels na tela
        duration: 1500, // Duração de 1.5 segundos
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0, // Desaparece
        duration: 1500,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Quando a animação acaba, limpamos a tela
      setShowFloatingText(false);
      setCurrentFoodHunger(null);
    });
  };

  // --- LOGOUT ---
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

  // --- LÓGICA DE NOTIFICAÇÕES ---
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

  // --- LÓGICA DE PROGRESSÃO
  const triggerXpBarAnimation = (oldXp: number, newXp: number) => {
    setShowXpBar(true);
    // Garante que a barra comece do valor antigo
    xpProgress.setValue(oldXp);
    console.log("log da animação: ", oldXp);

    Animated.sequence([
      Animated.timing(xpBarOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.timing(xpProgress, { toValue: newXp, duration: 1500, useNativeDriver: false }),
      Animated.delay(2000),
      Animated.timing(xpBarOpacity, { toValue: 0, duration: 400, useNativeDriver: false })
    ]).start(() => {
      setShowXpBar(false);
    });
  };

  // --- LÓGICA DE VESTIR ---
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

  // --- LÓGICA DE ANIMAÇÃO DE TROCA DE PERSONAGEM BASEADA NO HUMOR ---
  const triggerMoodChange = async (newEmotion: Emotion) => {
    try {
      const moodAssetMoodChange = Asset.fromModule(require('@/assets/audios/effects/mood_change_positive.mp3'));
      await moodAssetMoodChange.downloadAsync();
      const { sound: moodSound } = await Audio.Sound.createAsync(
        { uri: moodAssetMoodChange.localUri || moodAssetMoodChange.uri },
        { shouldPlay: true, volume: 0.8 }
      );

      // Configuramos para ele se auto-destruir assim que terminar
      moodSound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          await moodSound.unloadAsync();
        }
      });
    } catch (err) {
      // Se o Android der erro de arquivo, o jogo não trava
      console.log("Erro ao carregar áudio de humor (recuperando...):", err);
    }
    Animated.timing(moodTranslateY, {
      toValue: 600,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setVisualEmotion(newEmotion);

      Animated.spring(moodTranslateY, {
        toValue: 0,
        friction: 5,
        tension: 50,
        useNativeDriver: true,
      }).start();
    });
  };

  // --- FORMATA O VALOR DO S-COINS ---
  const formatMoney = (value: number) => {
    return (value / 100)
      .toFixed(2) // Garante 2 casas decimais
      .replace('.', ',') // Troca o ponto da casa decimal por vírgula
      .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.'); // Adiciona os pontos de milhar
  };

  // --- BALÃO DOS DADOS DE RELACIONAMENTO ---
  const toggleRelationTooltip = () => {
    if (showRelationTooltip) {
      // Fade out
      Animated.timing(relationTooltipOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowRelationTooltip(false));
    } else {
      // Fade in
      setShowRelationTooltip(true);
      Animated.timing(relationTooltipOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  // --- CÁLCULO DE PROGRESSO DE RELAÇÃO ---
  const getRelationProgress = () => {
    if (!relationship) return 0;

    const { relation_level, affection_points } = relationship;
    let min = 0;
    let max = 1;

    // Define os limites com base na regra do servidor
    switch (relation_level) {
      case 1: min = 0; max = 300; break;
      case 2: min = 300; max = 700; break;
      case 3: min = 700; max = 1200; break;
      case 4: min = 1200; max = 2000; break;
      case 5: return 100; // Se estiver no nível máximo, a barra fica cheia
      default: return 0;
    }

    // Trava os pontos entre o mínimo e o máximo para não vazar o layout (caso o servidor demore a virar o nível)
    const currentPoints = Math.max(min, Math.min(affection_points, max));

    // Retorna a porcentagem de 0 a 100
    return ((currentPoints - min) / (max - min)) * 100;
  };

  const relationProgressPercent = getRelationProgress();

  // Pega os caminhos (ex: "/pants/...") do estado sliviClothing 
  // e busca a imagem correspondente no nosso dicionário CLOTHES_IMAGES.
  const resolvedClothingItems = sliviClothing
    ? Object.values(sliviClothing) // Pega apenas os valores: ["/jackets/...", "/pants/..."]
      .map(path => CLOTHES_IMAGES[path]) // Troca o texto pelo require da imagem
      .filter(Boolean) // Remove itens que retornem 'undefined' (caso a API mande uma roupa que você ainda não mapeou)
    : []; // Se sliviClothing for null, retorna um array vazio

  const currentBgImage = WEATHER_IMAGES[weather.condition] || WEATHER_IMAGES.sun;


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
          <View style={[styles.iconButton, { display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }]}>
            <Image source={require('@/assets/images/components/s-coins_logo.png')} resizeMode='contain' style={{ width: 32, height: 32 }} />
            <Text style={styles.txtMoney}>{formatMoney(money)}</Text>
          </View>
          <View style={{ position: 'relative', zIndex: 50 }}>
            {/* O Background que funciona como Barra de Progresso */}

            <View style={{
              position: 'absolute',
              bottom: 0,
              left: 0.5,
              right: 0,
              height: `${relationProgressPercent}%`, // Usa a porcentagem calculada!
              backgroundColor: '#6bfff8', // Uma cor coral/coração bem legal, pode mudar pro tom que quiser!
              zIndex: -1,
              marginTop: '-5%',
              borderBottomLeftRadius: 12,
              borderBottomRightRadius: 12,
              // Fica atrás do texto
            }} />

            <TouchableOpacity
              onPress={toggleRelationTooltip}
              style={[styles.iconButton, {
                minHeight: 50, maxHeight: 50, minWidth: 49, maxWidth: 49,
                overflow: 'hidden', // Garante que o fundo preenchido obedeça o arredondamento
                padding: 0, // Removemos o padding para a barra poder grudar no chão
              }]}
            >

              {/* Centraliza o número do nível */}
              <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontWeight: '900', fontSize: 22 }}>{relationship?.relation_level}</Text>
              </View>

            </TouchableOpacity>

            {/* O Balãozinho (já implementado no passo anterior) */}

          </View>
          {showRelationTooltip && (
            <Animated.View style={[styles.relationBalloon, { opacity: relationTooltipOpacity }]}>
              <Text style={styles.relationBalloonText}>
                Pontos de Relacionamento: {relationship?.affection_points} {"\n"}{"\n"}
                O Slivi atualmente te considera "{relationship?.level_name || "Amigo"}". Para aumentar seus Pontos de Relacionamento
                e melhorar o nível de relação, cuide e mantenha um vínculo diário.
              </Text>
            </Animated.View>
          )}

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
          {/* <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
            <Ionicons name="exit" size={26} color="#000" />
          </TouchableOpacity> */}
        </View>
      </View>

      <View style={styles.progressBarArea}>
        {showXpBar && xpData && (
          <Animated.View style={[styles.xpBarContainer, { opacity: xpBarOpacity }]}>
            <View style={styles.headerProgress}>
              <Text style={styles.xpLevelText}>Nível {xpData.currentLevel}</Text>
              <Text style={styles.xpTextValue}>
                {xpData.currentXP} / {xpData.next_level_xp} XP
              </Text>
            </View>
            <View style={styles.xpBarBackground}>
              <Animated.View style={[styles.xpBarFill, { width: progressWidth }]} />
            </View>
          </Animated.View>
        )}
      </View>

      {/* --- (CENTRO) --- */}
      <View style={styles.windowWrapper}>
        <Image source={currentBgImage} style={styles.skyBackground} resizeMode='stretch' />
        <AirTrafficAnimation />
        {weather.is_day == true && weather.condition === 'sun' && (
          <WindowCleanerAnimation
            weatherCondition={weather.condition}
            windowSize={WINDOW_SIZE}
          />
        )}
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

        {showFloatingText && currentFoodHunger !== null && (
          <Animated.View
            style={[
              styles.floatingTextContainer,
              {
                transform: [{ translateY: floatAnim }],
                opacity: opacityAnim,
              }
            ]}
          >
            <Text style={styles.floatingText}>+{currentFoodHunger} XP!</Text>
          </Animated.View>
        )}

        {/* Sombreamento abaixo do Slivi */}
        <View style={styles.sliviShadow} />

        <ZzzAnimation isSleeping={sleepState === 'DORMINDO'} />
        <View style={{
          width: 600,
          height: 600, // Mesmas dimensões do Slivi
          overflow: 'hidden', // ISSO AQUI FAZ A MÁGICA DE ESCONDER ELE
          justifyContent: 'flex-end',
          zIndex: 10
        }}>
          <Animated.View style={{
            transform: [{ translateY: moodTranslateY }]
          }}>
            <Slivi
              scale={1}
              size={600}
              emotion={visualEmotion}
              eyeEmotion={displayEmotion === 'DORMINDO' ? visualEmotion : sleepState}
              mouthOverride={mouthOverride}
              clothingItems={resolvedClothingItems}
            />
          </Animated.View>
        </View>

        {foodVisible && currentSprites.length > 0 && (
          <Animated.Image
            source={currentSprites[foodStage]}
            style={[
              styles.plate,
              {
                opacity: plateOpacity, // Controla aparecer/desaparecer
                // Aplica as transformações de Posição (X,Y) e Rotação
                transform: [
                  {
                    // Interpola o valor de rotação de número para "graus" (string)
                    rotate: plateRotation.interpolate({
                      inputRange: [0, 90], // Recebe de 0 a 90 (definido no handleEat)
                      outputRange: ['0deg', '90deg'], // Converte para rotação CSS
                    }),
                  },
                ],
              },
            ]}
            resizeMode="contain"
          />
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
          <Ionicons name="restaurant" size={26} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => {
          if (isLightOn) {
            setClothesModalVisible(true);
          }
        }} style={styles.bottomNavIcon}>
          <MaterialCommunityIcons name="tshirt-v" size={26} color="#000" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>

          {/* MENU DROPDOWN (abre pra cima) */}
          {menuOpen && (
            <View style={styles.dropdownMenu}>
              <TouchableOpacity style={styles.dropdownItem}
                onPress={() => {
                  const clothingPaths = sliviClothing ? Object.values(sliviClothing) : [];
                  router.push({
                    pathname: './games/SliviPulse',
                    params: { emotion: emotion, clothing: JSON.stringify(clothingPaths) }
                  })
                }}>
                <Text style={{ textAlign: 'center', color: '#000', fontWeight: '800' }}>Slivi Pulse</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dropdownItem}
                onPress={() => {
                  const clothingPaths = sliviClothing ? Object.values(sliviClothing) : [];
                  router.push({
                    pathname: './games/SliviMaestro',
                    params: { emotion: emotion, clothing: JSON.stringify(clothingPaths) }
                  })
                }}>
                <Text style={{ textAlign: 'center', color: '#000', fontWeight: '800' }}>Slivi River</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dropdownItem}
                onPress={() => {
                  router.push({
                    pathname: './games/GameQuiz/GameMenuScreen',
                    params: { emotion: emotion }
                  })
                  // router.push({
                  //   pathname: "/games/ItemUnlocked",
                  //   params: { clothId: '7' } // Enviamos o ID para a nova tela
                  // });
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
            <Ionicons name="game-controller-sharp" size={26} color="#000" />
          </TouchableOpacity>

        </View>


        {/* Botão Chat (Teste de Fala) */}
        <TouchableOpacity onPress={() => {
          if (isLightOn) {
            router.push({
              pathname: "/store/Market",
              params: { money: money } // Enviamos o ID para a nova tela
            });
          }
        }
        } style={styles.bottomNavIcon}>
          <Ionicons name='storefront' size={26} color="#000" />
        </TouchableOpacity>
      </View>

      <PhoneMinigame
        onGameStart={() => {
          setIsGameActive(true);
          setIsPlayingMinigame(true);
        }}
        onGameEnd={(score) => {
          setIsGameActive(false);
          setIsPlayingMinigame(false);
          // Aqui você retoma os sons se quiser
        }}
        onSliviReaction={async (reaction) => {
          if (reaction === 'praise') {
            handleSliviSpeech('conquistaPonto')
          }
          else if (reaction === 'miss') {
            handleSliviSpeech('perdePonto')
          }
          else if (reaction === 'bomb') {
            handleSliviSpeech('perdeGame')
          }
        }}
        isLightOn={isLightOn}
      />


      <FoodModal
        visible={foodModalVisible}
        onClose={() => setFoodModalVisible(false)}
        onSelectFood={processFeeding}
      />
      <ClothesModal visible={clothesModalVisible} onClose={() => setClothesModalVisible(false)} onSelectClothes={handleSelectClothing} />
      {sliviStates && <StatesModal visible={statesModalVisible} onClose={() => setStatesModalVisible(false)} states={sliviStates} emotion={emotion} />}
      <Notification visible={notifModalVisible} onClose={() => setNotifModalVisible(false)} notifications={notifications} loading={loadingNotifs} />

      {rewardWord && (
        <View style={styles.rewardOverlay}>

          <Animated.Image
            source={(REWARDS_IMAGES as any)[rewardWord]}
            style={[
              styles.rewardImage,
              { transform: [{ scale: rewardScale }] }
            ]}
            resizeMode="contain"
          />
        </View>
      )}
    </View >
  );
}

const styles = StyleSheet.create({
  roomWall: {
    flex: 1,
    backgroundColor: "#EBE3CD",
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EBE3CD',
    zIndex: 9999,
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

  headerComponent: {
    marginTop: 50,
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  txtMoney: {
    fontWeight: '800',
    fontSize: 12,
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

  // --- REWARD STYLES ---
  rewardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)', // Fundo escuro cobrindo tudo
    zIndex: 99999, // Z-index altíssimo para ficar acima de TODOS os componentes
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardImage: {
    width: '100%',
    height: 250,
  },

  // --- PROGRESS BAR AREA ---
  progressBarArea: {
    display: 'flex',
    minWidth: '100%',
    maxWidth: '100%',
    height: 30,
  },

  headerProgress: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },

  // --- XP BAR STYLES ---
  xpBarContainer: {
    position: 'absolute',
    left: '15%',
    width: '75%',
    paddingVertical: 10,
    zIndex: 200,
    alignItems: 'center'
  },
  xpLevelText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  xpBarBackground: {
    width: '100%',
    height: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ffd700',
  },
  xpBarFill: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffeb3b',
  },
  xpTextValue: {
    fontSize: 18,
    paddingHorizontal: 1,
    fontWeight: 'bold',
    color: '#000',
    alignSelf: 'center',
  },

  // --- RELATION BALLOON STYLES ---
  relationBalloon: {
    position: 'absolute',
    top: 60,
    left: '20%',
    width: '100%',
    transform: [{ translateX: -60 }],
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  relationBalloonTail: {
    position: 'absolute',
    top: -7,
    marginLeft: -6,
    backgroundColor: '#fff',
    width: '100%',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#000',
    transform: [{ rotate: '45deg' }],
  },
  relationBalloonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
    textAlign: 'left',
  },


  // --- WINDOW & SLIVI STYLES ---
  windowWrapper: {
    width: WINDOW_SIZE, height: WINDOW_SIZE,
    marginTop: 40,
    overflow: 'hidden',
    zIndex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#000',
  },
  skyBackground: { width: '100%', height: '100%', position: 'absolute' },
  weatherLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1, opacity: 0.8 },
  windowFrameImage: { position: 'relative', width: '100%', height: '100%', zIndex: 10, opacity: 1 },

  sliviArea: {
    flex: 1,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: -20,
  },

  floatingTextContainer: {
    position: 'absolute',
    top: '35%',
    right: '25%',
    zIndex: 150,
  },
  floatingText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#4AFF88',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 2, height: 3 },
    textShadowRadius: 4,
    textTransform: 'uppercase',
  },


  sliviShadow: {
    position: 'absolute',
    bottom: -400,
    width: '100%',
    height: 700,
    backgroundColor: 'rgba(0,0,0,0.15)',
    transform: [{ scaleY: 0.5 }],
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

  plate: {
    position: 'absolute',
    width: 140, // Tamanho do prato
    height: 140,
    zIndex: 150,
    bottom: '75%',
    left: '40%',
    marginTop: -70, // Metade da altura para centralizar ponto de origem
    marginLeft: -70, // Metade da largura
  },

  // --- BOTTOM NAV BAR STYLES ---
  bottomNavBar: {
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 40,
    zIndex: 10,
    gap: 10
  },
  bottomNavIcon: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
  },
  dropdownMenu: {
    position: 'absolute',
    bottom: 80,
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
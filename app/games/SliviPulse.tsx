import { CLOTHES_IMAGES } from '@/src/components/clothes/clothesMap';
import { getObjectives, sendGameScore } from '@/src/services/gameService';
import { Emotion } from '@/src/types/emotions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Slivi from '../../components/slivi';


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/* ================= CONFIG ================= */
const GRAVITY = 0.6;
const MAX_VELOCITY = 15;
const SLIVI_SIZE = 40;
const SLIVI_X = 80;
const BOX_SIZE = 50;
const MAX_MISTAKES = 5;
const FEVER_DURATION = 8000; // 8 segundos de Fever

// Mapeamento: Emoção da API -> Valor Numérico (0-100)
const EMOTION_TO_MOOD: Record<Emotion, number> = {
  FUN: 95, FELIZ: 80, CALMO: 60, TRISTE: 35, BRAVO: 20, NERVOSO: 5,
};

const MOOD_THRESHOLDS = {
  FUN: 90, FELIZ: 75, CALMO: 50, TRISTE: 30, BRAVO: 15, NERVOSO: 0
};

const COLORS = {
  POSITIVE: '#4dff88',
  NEGATIVE: '#ff4d4d',
  BONUS: '#ffd700',
  MAGNET: '#3b82f6',
  GHOST: '#a855f7',
  SKY_BG: '#87CEEB',
  FEVER_BG: '#1a0b2e',
  CLOUD: 'rgba(255, 255, 255, 0.7)',
  FEVER_BAR: '#ffeb3b',
  COIN: '#f59e0b',
  HEART: '#ff1493',
  CHASER: '#ff8c00',
  EXPLOSIVE: '#8b0000',
  EXPLOSIVE_FLASH: '#ff4d4d',
};

/* ================= TYPES ================= */
type BoxType = 'POSITIVE' | 'NEGATIVE' | 'BONUS' | 'MAGNET' | 'GHOST' | 'COIN' | 'HEART' | 'CHASER' | 'EXPLOSIVE';

type GameBox = {
  id: number; x: number; y: number; type: BoxType;
  basePoints?: number; oscillate?: boolean; initialY?: number; offset?: number;
  spawnTime?: number;
};

type Cloud = {
  id: number; x: Animated.Value; y: number; scale: number; speed: number; width: number;
};

type Particle = {
  id: string; x: Animated.Value; y: Animated.Value; color: string; opacity: Animated.Value;
};

type FloatingText = {
  id: number; x: number; y: number; text: string; color: string;
  translateY: Animated.Value; opacity: Animated.Value;
};

type ObjectiveCondition = {
  used_magnet?: boolean;
  during_fever?: boolean;
};

type GameObjective = {
  id: number;
  current_value: number;
  target_value: number;
  type: string;
  description: string,
  conditions: string | null;
  title?: string; // Supondo que a API envie um título, ou você pode mapear localmente
};

/* ================= COMPONENT ================= */
export default function SliviPulse({ emotion }: { emotion: Emotion }) {

  const params = useLocalSearchParams();

  const sliviEmotion = params.emotion;
  console.log(sliviEmotion);

  const clothingParam = typeof params.clothing === 'string' ? params.clothing : '[]';
  const clothingPaths: string[] = JSON.parse(clothingParam);

  const resolvedClothingItems = clothingPaths
    .map(path => CLOTHES_IMAGES[path])
    .filter(Boolean);

  // --- REFS ---
  const y = useRef(SCREEN_HEIGHT / 2);
  const velocity = useRef(0);
  const pressing = useRef(false);
  const time = useRef(0);

  const [objectives, setObjectives] = useState<GameObjective[]>([]);
  const [userId, setUserId] = useState();
  const [token, setToken] = useState();

  // Animações
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;
  const feverTimer = useRef(new Animated.Value(0)).current; // 0 = vazio, 1 = cheio

  // --- ESTADOS DE LOADING ---
  const [isLoading, setIsLoading] = useState(true);
  const loadingPulse = useRef(new Animated.Value(1)).current;

  // --- ESTADOS ---
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const startTime = useRef<number | null>(null);

  // Mood System
  const [moodValue, setMoodValue] = useState(EMOTION_TO_MOOD[emotion] || 60);
  const currentEmotion = getEmotionFromMood(moodValue);

  // Entidades
  const [boxes, setBoxes] = useState<GameBox[]>([]);
  const [clouds, setClouds] = useState<Cloud[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [magnetActive, setMagnetActive] = useState(false);

  // Stats
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [jumps, setJumps] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [speed, setSpeed] = useState(4);
  const [difficultyLevel, setDifficultyLevel] = useState(0);
  const [totalBoxes, setTotalBoxes] = useState(0);
  const [bonusBoxes, setBonusBoxes] = useState(0);
  const [magneticBoxes, setMagneticBoxes] = useState(0);
  const [ghostBoxes, setGhostBoxes] = useState(0);
  const [collectedCoins, setCollectedCoins] = useState(0);

  // ✅ NOVO: Refs para espelhar os valores na hora do Game Over
  const scoreRef = useRef(0);
  const jumpsRef = useRef(0);
  const bonusBoxesRef = useRef(0);
  const maxComboRef = useRef(0);
  const totalBoxesRef = useRef(0);
  const collectedCoinsRef = useRef(0);
  const moodValueRef = useRef(EMOTION_TO_MOOD[emotion] || 60);

  // Estados fim de jogo
  const [gameOverRewards, setGameOverRewards] = useState<any>(null);
  const [isSavingScore, setIsSavingScore] = useState(false);

  // Novo Estado para o Texto de Hype
  const [hypeMessage, setHypeMessage] = useState<{ text: string; id: number } | null>(null);
  const hypeScale = useRef(new Animated.Value(0)).current;
  const hypeOpacity = useRef(new Animated.Value(0)).current;



  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { jumpsRef.current = jumps; }, [jumps]);
  useEffect(() => { bonusBoxesRef.current = bonusBoxes; }, [bonusBoxes]);
  useEffect(() => { maxComboRef.current = maxCombo; }, [maxCombo]);
  useEffect(() => { totalBoxesRef.current = totalBoxes; }, [totalBoxes]);
  useEffect(() => { collectedCoinsRef.current = collectedCoins; }, [collectedCoins]);
  useEffect(() => { moodValueRef.current = moodValue; }, [moodValue]);

  const comboScale = useRef(new Animated.Value(1)).current;
  const feverBuildAnim = useRef(new Animated.Value(0)).current;

  // Musica
  const [bgMusic, setBgMusic] = useState<Audio.Sound | null>(null);

  const usedMagnetInRun = useRef(false);
  const usedFeverInRun = useRef(false);

  const FEVER_THRESHOLD = 100;
  const isFever = combo >= FEVER_THRESHOLD;

  /* ================= HELPERS PUROS ================= */
  function getEmotionFromMood(mood: number): Emotion {
    if (mood >= MOOD_THRESHOLDS.FUN) return 'FUN';
    if (mood >= MOOD_THRESHOLDS.FELIZ) return 'FELIZ';
    if (mood >= MOOD_THRESHOLDS.CALMO) return 'CALMO';
    if (mood >= MOOD_THRESHOLDS.TRISTE) return 'TRISTE';
    if (mood >= MOOD_THRESHOLDS.BRAVO) return 'BRAVO';
    return 'NERVOSO';
  }

  function emotionMultiplier(emo: Emotion): number {
    const mults = { FUN: 2, FELIZ: 1.5, CALMO: 1, TRISTE: 0.8, BRAVO: 0.5, NERVOSO: 0.2 };
    return mults[emo] || 1;
  }

  useEffect(() => {
    // Animação de pulsar do texto de Loading
    Animated.loop(
      Animated.sequence([
        Animated.timing(loadingPulse, { toValue: 1.1, duration: 600, useNativeDriver: true }),
        Animated.timing(loadingPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    // Busca os objetivos e controla o tempo da tela
    async function prepareGame() {
      await refreshObjectives();

      // Segura a tela de loading por 2.5s para o usuário ler a missão
      setTimeout(() => {
        setIsLoading(false);
      }, 3500);
    }

    prepareGame();
  }, []);

  /* ================= FEVER LOGIC & TIMER ================= */
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isFever && !gameOver) {
      // 1. Iniciar Vibração Frenética
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      interval = setInterval(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 300);

      // 2. Iniciar Timer Visual
      feverTimer.setValue(1); // Barra cheia
      Animated.timing(feverTimer, {
        toValue: 0,
        duration: FEVER_DURATION,
        easing: Easing.linear,
        useNativeDriver: false, // Necessário false para animar width/flex
      }).start(({ finished }) => {
        // Se a animação terminou naturalmente (o tempo acabou)
        if (finished) {
          setCombo(0); // Acaba o Fever resetando o combo
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      });

    } else {
      // Se não é Fever (ou acabou), reseta o timer
      feverTimer.setValue(0);
      feverTimer.stopAnimation();
    }

    return () => clearInterval(interval);
  }, [isFever, gameOver]);

  // Observa o combo e atualiza a barra suavemente
  useEffect(() => {
    if (!isFever && !gameOver) {
      Animated.spring(feverBuildAnim, {
        toValue: Math.min(combo / FEVER_THRESHOLD, 1),
        useNativeDriver: false // False pois anima width e border
      }).start();
    }
  }, [combo, isFever, gameOver]);

  /* ================= NUVENS INIT ================= */
  useEffect(() => {
    const initialClouds = Array.from({ length: 6 }).map((_, i) => ({
      id: i,
      x: new Animated.Value(Math.random() * SCREEN_WIDTH),
      y: Math.random() * (SCREEN_HEIGHT / 2.5),
      scale: 0.5 + Math.random() * 0.8,
      speed: 0.5 + Math.random() * 1.5,
      width: 70 + Math.random() * 60,
    }));
    setClouds(initialClouds);

    const animLoop = setInterval(() => {
      initialClouds.forEach(c => {
        let curX = (c.x as any)._value - c.speed;
        if (curX < -150) curX = SCREEN_WIDTH + 50;
        c.x.setValue(curX);
      });
    }, 16);
    return () => clearInterval(animLoop);
  }, []);

  /* ================= PHYSICS LOOP ================= */
  useEffect(() => {
    if (!started || gameOver) return;

    const loop = setInterval(() => {
      time.current += 0.1;

      // Slivi Physics
      if (pressing.current) velocity.current += -1.5;
      velocity.current += GRAVITY;
      velocity.current = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocity.current));
      y.current += velocity.current;

      if (y.current < -SLIVI_SIZE || y.current > SCREEN_HEIGHT) handleGameOver();

      // Box Physics
      setBoxes(prev => prev.map(b => {
        let nX = b.x - speed;
        let nY = b.y;
        if (b.oscillate && b.initialY) nY = b.initialY + Math.sin(time.current + b.offset!) * 70;

        if (b.type === 'CHASER') {
          nX -= 2;
          nY += (y.current - nY) * 0.015;
        }

        if (magnetActive && (b.type === 'POSITIVE' || b.type === 'BONUS' || b.type === 'GHOST')) {
          const dx = SLIVI_X - nX;
          const dy = y.current - nY;
          if (Math.sqrt(dx * dx + dy * dy) < 400) {
            nX += dx * 0.12;
            nY += dy * 0.12;
          }
        }
        return { ...b, x: nX, y: nY };
      }).filter(b => b.x > -BOX_SIZE * 2));
    }, 16);
    return () => clearInterval(loop);
  }, [started, gameOver, speed, magnetActive]);

  /* ================= SPAWN SYSTEM ================= */
  useEffect(() => {
    if (!started || gameOver) return;

    const diffTimer = setInterval(() => {
      setSpeed(s => Math.min(s + 0.2, 15));
      setDifficultyLevel(d => d + 1);
    }, 5000);

    const spawnDelay = Math.max(500, 1200 - difficultyLevel * 60);
    const spawner = setInterval(() => {
      const waveSize = isFever ? 3 : (difficultyLevel > 5 ? 2 : 1);

      for (let i = 0; i < waveSize; i++) {
        const r = Math.random();
        let type: BoxType = 'POSITIVE';
        let oscillate = false;

        if (isFever) {
          if (r > 0.8) type = 'BONUS';
          else if (r > 0.95) type = 'MAGNET';
          else if (r < 0.15) type = 'COIN';
        } else {
          if (difficultyLevel < 2) {
            if (r > 0.7) type = 'NEGATIVE';
          }
          else {
            if (r > 0.6) type = 'NEGATIVE';
            if (r < 0.15) type = 'GHOST';
            if (r > 0.92) type = 'MAGNET';
            if (r < 0.05) type = 'BONUS';
            if (r < 0.10) type = 'COIN';
            if (Math.random() > 0.7) oscillate = true;

            if (difficultyLevel > 5 && Math.random() < 0.10) type = 'CHASER';

            if (difficultyLevel > 8 && Math.random() < 0.08) type = 'EXPLOSIVE';

            if (mistakes > 0 && Math.random() < 0.02) type = 'HEART';
          }
        }

        const spawnY = Math.random() * (SCREEN_HEIGHT - 200) + 100;

        // Define os pontos aleatórios dinamicamente
        let basePts = 10;
        if (type === 'GHOST') {
          basePts = 50;
        } else if (type === 'POSITIVE') {
          basePts = Math.floor(Math.random() * 10) + 1;
        } else if (type === 'COIN') {
          basePts = 0;
        }

        setBoxes(prev => [...prev, {
          id: Date.now() + Math.random(),
          x: SCREEN_WIDTH + i * (BOX_SIZE + 40),
          y: spawnY, initialY: spawnY, type, oscillate, offset: Math.random() * 10,
          basePoints: basePts,
          spawnTime: Date.now()
        }]);
      }
    }, spawnDelay);

    return () => { clearInterval(diffTimer); clearInterval(spawner); };
  }, [started, gameOver, difficultyLevel, isFever]);

  /* ================= COLLISION ================= */
  useEffect(() => {
    if (!started || gameOver) return;
    boxes.forEach(box => {
      const hitX = box.x < SLIVI_X + SLIVI_SIZE - 5 && box.x + BOX_SIZE > SLIVI_X + 5;
      const hitY = box.y < y.current + SLIVI_SIZE - 5 && box.y + BOX_SIZE > y.current + 5;
      if (hitX && hitY) resolveBox(box);
    });
  }, [boxes, mistakes, magnetActive, isFever]);

  // Função para dar play na música
  const playBackgroundMusic = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/audios/music/slivi_pulse.mp3'), // ⚠️ Ajuste o caminho para a sua música!
        {
          isLooping: true, // Faz a música tocar infinitamente
          volume: 0.5      // Ajuste o volume se achar muito alto (0.0 a 1.0)
        }
      );
      setBgMusic(sound);
      await sound.playAsync();
    } catch (error) {
      console.log("Erro ao tocar música:", error);
    }
  };

  // Função para parar a música
  const stopBackgroundMusic = async () => {
    if (bgMusic) {
      await bgMusic.stopAsync();
      await bgMusic.unloadAsync(); // Importante para liberar a memória!
      setBgMusic(null);
    }
  };

  useEffect(() => {
    // Se o jogo acabou de começar e NÃO está em Game Over, dá o play!
    if (started && !gameOver) {
      playBackgroundMusic();
    }

    // Cleanup: Se o usuário sair da tela do jogo do nada, descarrega a música da memória
    return () => {
      if (bgMusic) {
        bgMusic.unloadAsync();
      }
    };
  }, [started, gameOver]); //

  /* ================= ACTIONS ================= */
  function resolveBox(box: GameBox) {
    setBoxes(prev => {
      const exists = prev.find(b => b.id === box.id);
      if (!exists) return prev;
      return prev.filter(b => b.id !== box.id);
    });

    spawnParticles(box.x, box.y, COLORS[box.type]);

    if (box.type === 'NEGATIVE' || box.type === 'CHASER' || box.type === 'EXPLOSIVE') {
      if (isFever) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      triggerShake();
      setCombo(0); // Reseta o combo no erro

      const damage = box.type === 'EXPLOSIVE' ? 2 : 1;
      setMistakes(m => m + damage);
      setMoodValue(v => Math.max(0, v - 20));

      let msg = 'DANO!';
      if (box.type === 'CHASER') msg = 'PEGOU!';
      if (box.type === 'EXPLOSIVE') msg = 'KABOOM!';

      spawnFloatingText(box.x, box.y, msg, box.type === 'EXPLOSIVE' ? COLORS.EXPLOSIVE_FLASH : COLORS.NEGATIVE);
      if (mistakes + damage >= MAX_MISTAKES) handleGameOver();

    } else {
      // --- CAIXAS POSITIVAS ---
      setTotalBoxes(v => v + 1);

      // UNICO LUGAR ONDE O COMBO AUMENTA:
      setCombo(prevCombo => {
        const newCombo = prevCombo + 1;

        setMaxCombo(prevMax => Math.max(prevMax, newCombo));

        // Animação do texto do combo
        comboScale.setValue(1.5);
        Animated.spring(comboScale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true
        }).start();

        // DISPARO DO HYPE (Estava quebrado porque usava newCombo errado ou disparava duplo)
        if (newCombo === 12) triggerHype("MUITO BEM!");
        if (newCombo === 24) triggerHype("INCRÍVEL!");
        if (newCombo === FEVER_THRESHOLD - 5) triggerHype("QUASE LÁ!");
        if (newCombo === FEVER_THRESHOLD) triggerHype("SLIVI FEVER!!!");
        if (newCombo === 50) triggerHype("IMPARÁVEL!");

        return newCombo;
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Cálculo de Pontos
      const feverMult = isFever ? 2 : 1;
      const points = Math.round((box.basePoints || 10) * emotionMultiplier(currentEmotion) * feverMult);
      setScore(s => s + points);

      if (box.type !== 'COIN') {
        spawnFloatingText(box.x, box.y, `+${points}`, COLORS.POSITIVE);
      }

      setMoodValue(v => Math.min(100, v + 4));

      // Lógicas específicas de itens
      if (box.type === 'COIN') {
        const coinValue = Math.floor(Math.random() * 5) + 1;
        setCollectedCoins(c => c + coinValue);
        spawnFloatingText(box.x, box.y, `+${coinValue} 🪙`, COLORS.COIN);
      }

      if (box.type === 'HEART') {
        setMistakes(m => Math.max(0, m - 1));
        spawnFloatingText(box.x, box.y, '+1 VIDA! ❤️', COLORS.HEART);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      if (box.type === 'BONUS') {
        setScore(s => s + 100);
        spawnFloatingText(box.x, box.y, 'BONUS!', COLORS.BONUS);
        setBonusBoxes(v => v + 1);
      }

      if (box.type === 'MAGNET') {
        setMagnetActive(true);
        setMagneticBoxes(v => v + 1);
        usedMagnetInRun.current = true;
        setTimeout(() => setMagnetActive(false), 5000);
        spawnFloatingText(box.x, box.y, 'MAGNET!', COLORS.MAGNET);
      }

      if (box.type === 'GHOST') setGhostBoxes(v => v + 1);
      if (isFever) usedFeverInRun.current = true;
    }
  }

  const refreshObjectives = async () => {
    try {
      const data = await getObjectives('pulse');
      setObjectives(data);
    } catch (error) {
      console.error(error);
    }
  };

  // Função para disparar o Hype
  function triggerHype(text: string) {
    setHypeMessage({ text, id: Date.now() });
    hypeScale.setValue(0.5);
    hypeOpacity.setValue(1);

    Animated.sequence([
      Animated.spring(hypeScale, { toValue: 1.2, friction: 3, useNativeDriver: true }),
      Animated.timing(hypeScale, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(800), // Tempo que a mensagem fica na tela
      Animated.timing(hypeOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start();
  }

  async function handleGameOver() {
    if (gameOver) return;
    setGameOver(true);
    triggerShake();
    setMoodValue(0);
    stopBackgroundMusic();

    if (startTime.current) {
      const duration = Math.round((Date.now() - startTime.current) / 1000);
      setIsSavingScore(true); // Inicia o loading

      try {
        const response = await sendGameScore({
          game: 'pulse',
          score: scoreRef.current,
          duration,
          finalEmotionValue: moodValueRef.current,
          finalEmotionState: currentEmotion,
          stats: {
            "max_score": scoreRef.current,
            "total_jumps": jumpsRef.current,
            "bonus_boxes": bonusBoxesRef.current,
            "max_combo": maxComboRef.current,
            "total_boxes": totalBoxesRef.current,
            "collected_coins": collectedCoinsRef.current,
            "run_duration": duration
          }
        });

        if (response) {
          console.log("Score salvo:", response);
          setGameOverRewards(response); // Guarda a resposta para usar no clique
        }
      } catch (err) {
        console.error("Erro ao enviar score", err);
      } finally {
        setIsSavingScore(false); // Finaliza o loading
      }
    }
  }

  // Função auxiliar para definir a cor do combo
  function getComboColor(currentCombo: number) {
    if (currentCombo >= 85) return '#FF4500'; // Laranja avermelhado intenso
    if (currentCombo >= 60) return '#FFD700'; // Dourado
    return '#FFFFFF'; // Branco normal
  }

  async function handleContinue() {
    const token = await AsyncStorage.getItem('slivi_token');
    const userId = await AsyncStorage.getItem('slivi_userId');
    if (!gameOverRewards) {
      router.replace({
        pathname: '/loading',
        params: { token, userId },
      });
      return;
    }

    const { unlocked_clothes, unlocked_seals } = gameOverRewards;

    if (unlocked_clothes && unlocked_clothes.length > 0) {
      router.push({
        pathname: "./ItemUnlocked",
        params: { clothId: unlocked_clothes[0] }
      });
    } else if (unlocked_seals && unlocked_seals.length > 0) {
      router.push({
        pathname: "/games/SealUnlocked",
        params: { seals: JSON.stringify(unlocked_seals) }
      });
    } else {
      router.replace("../loading");
    }
  }

  function restart() {
    setStarted(false); setGameOver(false);
    setScore(0); setCombo(0); setMistakes(0);
    setSpeed(4); setDifficultyLevel(0);
    setCollectedCoins(0);
    setMoodValue(EMOTION_TO_MOOD[emotion] || 60);
    setBoxes([]); setFloatingTexts([]); setParticles([]);
    setMagnetActive(false);
    y.current = SCREEN_HEIGHT / 2;
    velocity.current = 0;
    startTime.current = null;
    refreshObjectives();

    // Zera o timer do Fever Mode caso o jogador reinicie no meio dele
    feverTimer.stopAnimation();
    feverTimer.setValue(0);
  }

  function isObjectiveComplete(obj: GameObjective): boolean {
    // 1. Verifica as condições estritas (se houver)
    if (obj.conditions) {
      try {
        const conds: ObjectiveCondition = JSON.parse(obj.conditions);

        // Se o objetivo proíbe usar imã, mas o jogador usou nesta run, falha automaticamente
        if (conds.used_magnet === false && usedMagnetInRun.current === true) return false;

        // Se o objetivo exige não estar no fever, mas o jogador entrou no fever
        if (conds.during_fever === false && usedFeverInRun.current === true) return false;
      } catch (e) {
        console.error("Erro ao fazer parse das condições do objetivo", e);
      }
    }

    // 2. Verifica o progresso numérico
    let sessionValue = 0;

    // Mapeie aqui os "types" que o servidor pode enviar para os seus estados locais
    switch (obj.type) {
      case 'total_boxes': sessionValue = totalBoxes; break;
      case 'bonus_boxes': sessionValue = bonusBoxes; break;
      case 'magnetic_boxes': sessionValue = magneticBoxes; break;
      case 'ghost_boxes': sessionValue = ghostBoxes; break;
      case 'score': sessionValue = score; break;
      default: sessionValue = 0;
    }

    // O objetivo está completo se o valor que ele já tinha + o que pegou agora bater a meta
    return (obj.current_value + sessionValue) >= obj.target_value;
  }

  /* ================= VISUALS ================= */
  function triggerShake() {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }

  function spawnParticles(x: number, y: number, color: string) {
    const newPs = Array.from({ length: 6 }).map(() => ({
      id: Math.random().toString(),
      x: new Animated.Value(x + BOX_SIZE / 2),
      y: new Animated.Value(y + BOX_SIZE / 2),
      opacity: new Animated.Value(1),
      color
    }));
    setParticles(prev => [...prev, ...newPs]);
    newPs.forEach(p => {
      Animated.parallel([
        Animated.timing(p.x, { toValue: (p.x as any)._value + (Math.random() - 0.5) * 120, duration: 600, useNativeDriver: true }),
        Animated.timing(p.y, { toValue: (p.y as any)._value + (Math.random() - 0.5) * 120, duration: 600, useNativeDriver: true }),
        Animated.timing(p.opacity, { toValue: 0, duration: 600, useNativeDriver: true })
      ]).start(() => setParticles(prev => prev.filter(i => i.id !== p.id)));
    });
  }

  function spawnFloatingText(x: number, y: number, text: string, color: string) {
    const id = Date.now() + Math.random();
    const translateY = new Animated.Value(0);
    const opacity = new Animated.Value(1);
    setFloatingTexts(p => [...p, { id, x, y, text, color, translateY, opacity }]);
    Animated.parallel([
      Animated.timing(translateY, { toValue: -60, duration: 800, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start(() => setFloatingTexts(prev => prev.filter(t => t.id !== id)));
  }

  // Background Interpolation
  useEffect(() => {
    Animated.timing(bgAnim, { toValue: isFever ? 1 : 0, duration: 800, useNativeDriver: false }).start();
  }, [isFever]);

  const backgroundColor = bgAnim.interpolate({
    inputRange: [0, 1], outputRange: [COLORS.SKY_BG, COLORS.FEVER_BG]
  });
  const cloudOpacity = bgAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.2] });

  // Fever Bar Width Interpolation
  const feverBarWidth = feverTimer.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });


  // A largura da barra enchendo
  const buildFeverWidth = feverBuildAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  // A borda engrossando quando passa de 80% (ex: combo 24 de 30)
  const feverBorderWidth = feverBuildAnim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [1, 1, 4] // Fica com 4px de borda no finalzinho!
  });

  // A cor da borda mudando para vermelho/laranja no final
  const feverBorderColor = feverBuildAnim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [COLORS.BONUS, COLORS.BONUS, '#FF4500']
  });

  /* ================= RENDER ================= */
  return (
    <Pressable style={{ flex: 1 }}
      onPressIn={() => {
        if (gameOver) return;
        if (!started) { setStarted(true); startTime.current = Date.now(); }
        pressing.current = true;
        setJumps(j => j + 1);
      }}
      onPressOut={() => pressing.current = false}
      onPress={gameOver ? restart : undefined}
    >
      {/* Container Externo: Animação de background via JS */}
      <Animated.View style={[styles.container, { backgroundColor }]}>
        {hypeMessage && (
          <Animated.View
            key={hypeMessage.id}
            style={{
              position: 'absolute', top: '30%', left: 0, right: 0,
              alignItems: 'center', zIndex: 100, pointerEvents: 'none',
              opacity: hypeOpacity, transform: [{ scale: hypeScale }]
            }}
          >
            <Text style={{
              fontSize: 42, fontWeight: '900', color: '#FFD700',
              textShadowColor: '#FF4500', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 10,
              fontStyle: 'italic'
            }}>
              {hypeMessage.text}
            </Text>
          </Animated.View>
        )}

        {/* Container Interno: Animação de Transform (Shake) via Nativo */}
        <Animated.View style={{ flex: 1, transform: [{ translateX: shakeAnim }] }}>
          {/* --- CLOUDS --- */}
          {clouds.map(c => (
            <Animated.View key={c.id} style={[styles.cloud, {
              top: c.y, width: c.width, opacity: cloudOpacity,
              transform: [{ translateX: c.x }, { scale: c.scale }]
            }]}>
              <View style={styles.cloudBubbleMain} />
              <View style={[styles.cloudBubble, { left: -15, top: 10 }]} />
              <View style={[styles.cloudBubble, { right: -15, top: 10 }]} />
            </Animated.View>
          ))}

          {isFever && <View style={styles.feverOverlay} />}

          {/* --- HUD --- */}
          <View style={styles.hudTop}>
            <View style={{ width: '50%', paddingHorizontal: '3%' }}>
              <Text style={styles.hudText}>Emoção Atual: {currentEmotion} (x{emotionMultiplier(currentEmotion)})</Text>
              <View style={{ flexDirection: 'row', marginTop: 4 }}>
                {Array.from({ length: MAX_MISTAKES }).map((_, i) => (
                  <Text key={i} style={{ opacity: i < (MAX_MISTAKES - mistakes) ? 1 : 0.2 }}>❤️</Text>
                ))}
              </View>
              {/* --- BARRA DE FEVER --- */}
              <Animated.View style={[
                styles.feverBarContainer,
                {
                  borderWidth: isFever ? 4 : feverBorderWidth,
                  borderColor: isFever ? '#FF4500' : feverBorderColor
                }
              ]}>
                <Animated.View style={[
                  styles.feverBarFill,
                  {
                    // Se for Fever, usa o timer que esvazia. Se não, usa a barra que enche!
                    width: isFever ? feverBarWidth : buildFeverWidth,
                    backgroundColor: isFever ? COLORS.FEVER_BAR : '#ff9800' // Laranja enchendo, Amarelo no Fever
                  }
                ]} />
                <Text style={styles.feverBarText}>
                  {isFever ? 'FEVER TIME!' : (combo >= FEVER_THRESHOLD - 5 ? 'QUASE LÁ!' : 'FEVER')}
                </Text>
              </Animated.View>
            </View>

            {/* Lado Direito: Score */}
            <View style={{ display: 'flex', paddingHorizontal: '3%', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end', width: '50%' }}>
              <Text style={[styles.score, { color: isFever ? COLORS.BONUS : '#fff' }]}>{score}</Text>
              <Animated.Text style={[
                styles.hudText,
                {
                  fontSize: 18,
                  color: getComboColor(combo),
                  transform: [{ scale: comboScale }],
                  textShadowColor: 'rgba(0,0,0,0.8)',
                  textShadowRadius: 4
                }
              ]}>
                Combo: {combo}x
              </Animated.Text>
              <Text style={{ color: COLORS.COIN, fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>
                🪙 S-Coins: {collectedCoins}
              </Text>
              {/* RENDERIZAÇÃO DOS OBJETIVOS */}
              {objectives.map(obj => {
                const completed = isObjectiveComplete(obj);
                return (
                  <View key={obj.id} style={{ alignItems: 'flex-end', marginBottom: 2 }}>
                    <Text style={[styles.hudText, { fontSize: 12, opacity: completed ? 0.6 : 1 }]}>
                      Objetivo:
                    </Text>
                    <Text style={[styles.hudText, { fontSize: 12, opacity: completed ? 0.6 : 1 }]}>
                      {obj.title || `${obj.description}`}
                    </Text>
                    {completed && <Text style={{ color: COLORS.POSITIVE, marginLeft: 6, fontWeight: 'bold' }}>✓</Text>}
                  </View>
                );
              })}
              {magnetActive && <Text style={styles.magnetText}>MAGNET ON</Text>}
            </View>
          </View>

          {/* --- SLIVI --- */}
          <View style={{ zIndex: 30, position: 'absolute', top: y.current, left: SLIVI_X, width: SLIVI_SIZE, height: SLIVI_SIZE }}>
            {isFever && <View style={styles.aura} />}
            <Slivi
              emotion={currentEmotion}
              size={300}
              clothingItems={resolvedClothingItems}
            />
          </View>

          {/* --- PARTICLES --- */}
          {particles.map(p => (
            <Animated.View key={p.id} style={[styles.particle, {
              backgroundColor: p.color, opacity: p.opacity,
              transform: [{ translateX: p.x }, { translateY: p.y }]
            }]} />
          ))}

          {/* --- BOXES --- */}
          {boxes.map(box => {
            // --- MÁGICA DA TNT ---
            const isExplosive = box.type === 'EXPLOSIVE';
            const ageMs = Date.now() - (box.spawnTime || Date.now());
            // Calcula o número de 3 a 0 baseado no tempo que a caixa está na tela
            const countdown = Math.max(0, 3 - Math.floor(ageMs / 1000));
            // Pisca freneticamente (alterna a cor a cada 200ms)
            const isFlashing = isExplosive && (ageMs % 400 < 200);

            let bgColor = COLORS[box.type] || '#fff';
            if (isExplosive) bgColor = isFlashing ? COLORS.EXPLOSIVE_FLASH : COLORS.EXPLOSIVE;

            return (
              <View key={box.id} style={[styles.box, {
                left: box.x, top: box.y,
                backgroundColor: bgColor,
                opacity: box.type === 'GHOST' ? 0.3 : 1,
                borderWidth: box.type === 'GHOST' ? 1 : (isExplosive ? 2 : 0),
                borderColor: isExplosive ? '#fff' : '#fff',
                elevation: (box.type === 'MAGNET' || isExplosive) ? 10 : 0
              }]}>
                {box.type === 'POSITIVE' && <Text style={styles.boxText}>+{box.basePoints}</Text>}
                {box.type === 'BONUS' && <Text style={styles.boxText}>★</Text>}
                {box.type === 'MAGNET' && <Text style={styles.boxText}>🧲</Text>}
                {box.type === 'GHOST' && <Text style={styles.boxText}>👻</Text>}
                {box.type === 'NEGATIVE' && <Text style={styles.boxText}>X</Text>}
                {box.type === 'CHASER' && <Text style={styles.boxText}>👁️</Text>}
                {box.type === 'HEART' && <Text style={[styles.boxText, { fontSize: 24 }]}>❤️</Text>}

                {/* O NÚMERO DA TNT DIMINUINDO! */}
                {isExplosive && (
                  <Text style={[styles.boxText, { color: '#fff', fontSize: 28, fontWeight: '900' }]}>
                    {countdown}
                  </Text>
                )}

                {box.type === 'COIN' && (
                  <Image source={require('@/assets/images/components/s-coins_logo.png')} style={{ width: 30, height: 30, borderRadius: 15 }} />
                )}
              </View>
            );
          })}

          {/* --- FLOATING TEXT --- */}
          {floatingTexts.map(t => (
            <Animated.Text key={t.id} style={[styles.floatingText, {
              left: t.x, top: t.y, color: t.color, opacity: t.opacity,
              transform: [{ translateY: t.translateY }]
            }]}>{t.text}</Animated.Text>
          ))}

          {/* --- OVERLAYS --- */}
          {!started && !gameOver && (
            <View style={styles.centerOverlay}>
              <Text style={styles.overlayTitle}>Slivi Pulse</Text>
              <Text style={styles.overlaySubtitle}>Toque para começar</Text>
            </View>
          )}

          {/* --- TELA DE LOADING / PRIMING --- */}
          {isLoading && (
            <View style={[styles.centerOverlay, { zIndex: 100, backgroundColor: '#0d1117' }]}>
              <Animated.Text style={[
                styles.overlayTitle,
                { color: '#FFD700', transform: [{ scale: loadingPulse }] }
              ]}>
                Aguarde...
              </Animated.Text>

              <View style={{ marginTop: 30, alignItems: 'center', paddingHorizontal: 20 }}>
                <Text style={{ color: '#888', fontSize: 16, fontWeight: 'bold', letterSpacing: 2, marginBottom: 8 }}>
                  MISSÃO ATUAL
                </Text>

                {objectives.length > 0 ? (
                  <Text style={{ color: '#fff', fontSize: 22, textAlign: 'center', fontWeight: 'bold' }}>
                    {objectives[0].title || objectives[0].description}
                  </Text>
                ) : (
                  <Text style={{ color: '#fff', fontSize: 18, textAlign: 'center', fontStyle: 'italic' }}>
                    Sobreviva o máximo que puder!
                  </Text>
                )}
              </View>

              <Text style={{ position: 'absolute', bottom: 40, color: '#555', fontSize: 14 }}>
                Carregando assets...
              </Text>
            </View>
          )}

          {gameOver && (
            <View style={styles.centerOverlay}>
              <Text style={[styles.overlayTitle, { color: COLORS.NEGATIVE }]}>GAME OVER</Text>
              <Text style={styles.overlaySubtitle}>Score: {score}</Text>

              <Pressable
                onPress={(e) => {
                  e.stopPropagation(); // Impede que o clique reinicie o jogo acidentalmente
                  if (!isSavingScore) handleContinue();
                }}
                style={{
                  marginTop: 20,
                  borderRadius: 10,
                  backgroundColor: isSavingScore ? '#ccc' : '#FFD700',
                  padding: 12,
                  paddingHorizontal: 24
                }}
              >
                <Text style={{ color: '#0d1117', fontWeight: 'bold', fontSize: 16 }}>
                  {isSavingScore ? 'SALVANDO...' : 'CONTINUAR'}
                </Text>
              </Pressable>
            </View>
          )}

        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  feverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 215, 0, 0.05)', zIndex: -1 },

  // Fever Bar Styles
  feverBarContainer: {
    width: '100%', height: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, overflow: 'hidden',
    zIndex: 25, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.BONUS
  },
  feverBarFill: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    backgroundColor: COLORS.FEVER_BAR,
  },
  feverBarText: {
    color: '#000', fontWeight: '900', fontSize: 12, zIndex: 2
  },

  cloud: { position: 'absolute', height: 40, justifyContent: 'center', alignItems: 'center', zIndex: -5 },
  cloudBubbleMain: { width: '100%', height: 40, borderRadius: 20, backgroundColor: COLORS.CLOUD },
  cloudBubble: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.CLOUD },

  hudTop: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, zIndex: 20 },
  hudText: { color: '#fff', fontSize: 14, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  score: { color: '#fff', fontSize: 24, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  magnetText: { color: COLORS.MAGNET, fontWeight: 'bold', fontSize: 12 },

  box: { position: 'absolute', width: BOX_SIZE, height: BOX_SIZE, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  boxText: { fontWeight: 'bold', color: '#0d1117', fontSize: 16 },
  floatingText: { position: 'absolute', fontSize: 20, fontWeight: '900', textShadowColor: 'black', textShadowRadius: 2 },
  particle: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },

  centerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 30 },
  overlayTitle: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  overlaySubtitle: { fontSize: 18, color: '#fff' },

  aura: { position: 'absolute', top: -10, left: -10, width: SLIVI_SIZE + 20, height: SLIVI_SIZE + 20, borderRadius: 30, backgroundColor: 'rgba(255, 215, 0, 0.3)', borderWidth: 2, borderColor: COLORS.BONUS }
});
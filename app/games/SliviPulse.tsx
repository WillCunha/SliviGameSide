import { CLOTHES_IMAGES } from '@/src/components/clothes/clothesMap';
import { getObjectives, sendGameScore } from '@/src/services/gameService';
import { Emotion } from '@/src/types/emotions';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
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
  POSITIVE: '#4dff88', NEGATIVE: '#ff4d4d', BONUS: '#ffd700',
  MAGNET: '#3b82f6', GHOST: '#a855f7', SKY_BG: '#87CEEB',
  FEVER_BG: '#1a0b2e', CLOUD: 'rgba(255, 255, 255, 0.7)',
  FEVER_BAR: '#ffeb3b', // Amarelo brilhante
};

/* ================= TYPES ================= */
type BoxType = 'POSITIVE' | 'NEGATIVE' | 'BONUS' | 'MAGNET' | 'GHOST';

type GameBox = {
  id: number; x: number; y: number; type: BoxType;
  basePoints?: number; oscillate?: boolean; initialY?: number; offset?: number;
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

  // Animações
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;
  const feverTimer = useRef(new Animated.Value(0)).current; // 0 = vazio, 1 = cheio

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

  // ✅ NOVO: Refs para espelhar os valores na hora do Game Over
  const scoreRef = useRef(0);
  const jumpsRef = useRef(0);
  const bonusBoxesRef = useRef(0);
  const maxComboRef = useRef(0);
  const totalBoxesRef = useRef(0);
  const moodValueRef = useRef(EMOTION_TO_MOOD[emotion] || 60);

  // Estados fim de jogo
  const [gameOverRewards, setGameOverRewards] = useState<any>(null);
  const [isSavingScore, setIsSavingScore] = useState(false);

  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { jumpsRef.current = jumps; }, [jumps]);
  useEffect(() => { bonusBoxesRef.current = bonusBoxes; }, [bonusBoxes]);
  useEffect(() => { maxComboRef.current = maxCombo; }, [maxCombo]);
  useEffect(() => { totalBoxesRef.current = totalBoxes; }, [totalBoxes]);
  useEffect(() => { moodValueRef.current = moodValue; }, [moodValue]);

  // Musica
  const [bgMusic, setBgMusic] = useState<Audio.Sound | null>(null);

  const usedMagnetInRun = useRef(false);
  const usedFeverInRun = useRef(false);


  const isFever = combo >= 10;

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
      setSpeed(s => Math.min(s + 0.2, 12));
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
        } else {
          if (difficultyLevel < 2) { if (r > 0.7) type = 'NEGATIVE'; }
          else {
            if (r > 0.6) type = 'NEGATIVE';
            if (r < 0.15) type = 'GHOST';
            if (r > 0.92) type = 'MAGNET';
            if (r < 0.05) type = 'BONUS';
            if (Math.random() > 0.7) oscillate = true;
          }
        }

        const spawnY = Math.random() * (SCREEN_HEIGHT - 200) + 100;

        // Define os pontos aleatórios dinamicamente
        let basePts = 10;
        if (type === 'GHOST') {
          basePts = 50;
        } else if (type === 'POSITIVE') {
          basePts = Math.floor(Math.random() * 10) + 1;
        }

        setBoxes(prev => [...prev, {
          id: Date.now() + Math.random(),
          x: SCREEN_WIDTH + i * (BOX_SIZE + 40),
          y: spawnY, initialY: spawnY, type, oscillate, offset: Math.random() * 10,
          basePoints: basePts
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
    setBoxes(prev => prev.filter(b => b.id !== box.id));
    spawnParticles(box.x, box.y, COLORS[box.type]);

    if (box.type === 'NEGATIVE') {
      if (isFever) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      triggerShake();
      setCombo(0);
      setMistakes(m => m + 1);
      setMoodValue(v => Math.max(0, v - 20));
      spawnFloatingText(box.x, box.y, 'DANO!', COLORS.NEGATIVE);
      if (mistakes + 1 >= MAX_MISTAKES) handleGameOver();

    } else {
      setTotalBoxes(v => v + 1);

      setCombo(c => {
        const newCombo = c + 1;
        setMaxCombo(m => Math.max(m, newCombo));
        return newCombo;
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setCombo(c => c + 1); // Em Fever, o combo aumenta só para score, mas o tempo decide o fim

      const feverMult = isFever ? 2 : 1;
      const points = Math.round((box.basePoints || 10) * emotionMultiplier(currentEmotion) * feverMult);
      setScore(s => s + points);
      spawnFloatingText(box.x, box.y, `+${points}`, COLORS.POSITIVE);
      setMoodValue(v => Math.min(100, v + 4));

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
      if (box.type === 'GHOST') {
        setGhostBoxes(v => v + 1);
      }

      if (isFever) {
        usedFeverInRun.current = true;
      }
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

  function handleContinue() {
    // Se por algum motivo falhou ou não tem dados, volta para a home como fallback
    if (!gameOverRewards) {
      router.replace("../loading");
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

  useEffect(() => {
    refreshObjectives();
  }, []);

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
            {/* Lado Esquerdo: Emoção e Vida */}
            <View>
              <Text style={styles.hudText}>Emoção Atual: {currentEmotion} (x{emotionMultiplier(currentEmotion)})</Text>
              <View style={{ flexDirection: 'row', marginTop: 4 }}>
                {Array.from({ length: MAX_MISTAKES }).map((_, i) => (
                  <Text key={i} style={{ opacity: i < (MAX_MISTAKES - mistakes) ? 1 : 0.2 }}>❤️</Text>
                ))}
              </View>
            </View>

            {/* Lado Direito: Score */}
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.score, { color: isFever ? COLORS.BONUS : '#fff' }]}>{score}</Text>
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

          {/* --- BARRA DE FEVER --- */}
          {isFever && (
            <View style={styles.feverBarContainer}>
              <Animated.View style={[styles.feverBarFill, { width: feverBarWidth }]} />
              <Text style={styles.feverBarText}>FEVER TIME!</Text>
            </View>
          )}

          {/* --- SLIVI --- */}
          <View style={{ position: 'absolute', top: y.current, left: SLIVI_X, width: SLIVI_SIZE, height: SLIVI_SIZE }}>
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
          {boxes.map(box => (
            <View key={box.id} style={[styles.box, {
              left: box.x, top: box.y,
              backgroundColor: COLORS[box.type] || '#fff',
              opacity: box.type === 'GHOST' ? 0.3 : 1,
              borderWidth: box.type === 'GHOST' ? 1 : 0, borderColor: '#fff',
              elevation: box.type === 'MAGNET' ? 10 : 0
            }]}>
              {box.type === 'POSITIVE' && <Text style={styles.boxText}>+{box.basePoints}</Text>}
              {box.type === 'BONUS' && <Text style={styles.boxText}>★</Text>}
              {box.type === 'MAGNET' && <Text style={styles.boxText}>🧲</Text>}
              {box.type === 'GHOST' && <Text style={styles.boxText}>👻</Text>}
              {box.type === 'NEGATIVE' && <Text style={styles.boxText}>X</Text>}
            </View>
          ))}

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
    position: 'absolute', top: 110, left: '15%', width: '70%', height: 20,
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

  hudTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingHorizontal: 20, zIndex: 20 },
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
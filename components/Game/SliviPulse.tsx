import { Emotion } from '@/src/types/emotions';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Slivi from '../slivi';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/* ================= CONFIG ================= */
const GRAVITY = 0.6;
const MAX_VELOCITY = 15;
const SLIVI_SIZE = 40;
const SLIVI_X = 80;
const BOX_SIZE = 50;
const MAX_MISTAKES = 5;

// Configuração do "Mood Meter" (0 a 100)
const MOOD_THRESHOLDS = {
  FUN: 90,
  FELIZ: 75,
  CALMO: 50,
  TRISTE: 30,
  BRAVO: 15,
  NERVOSO: 0
};

// Cores
const COLORS = {
  POSITIVE: '#4dff88',
  NEGATIVE: '#ff4d4d',
  BONUS: '#ffd700',
  MAGNET: '#3b82f6',
  GHOST: '#a855f7',
  SKY_BG: '#87CEEB', // Azul Céu
  FEVER_BG: '#1a0b2e', // Roxo Escuro
  CLOUD: 'rgba(255, 255, 255, 0.6)',
};

/* ================= TYPES ================= */
type BoxType = 'POSITIVE' | 'NEGATIVE' | 'BONUS' | 'MAGNET' | 'GHOST';

type GameBox = {
  id: number;
  x: number;
  y: number;
  type: BoxType;
  basePoints?: number;
  oscillate?: boolean;
  initialY?: number;
  offset?: number;
};

type FloatingText = {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  translateY: Animated.Value;
  opacity: Animated.Value;
};

type Particle = {
  id: string;
  x: Animated.Value;
  y: Animated.Value;
  color: string;
  opacity: Animated.Value;
};

type Cloud = {
  id: number;
  x: Animated.Value;
  y: number;
  scale: number;
  speed: number;
  width: number;
};

type Props = {
  emotion: Emotion;
};

/* ================= HELPERS ================= */
function getInitialMood(emotion: Emotion): number {
  switch (emotion) {
    case 'FUN': return 95;
    case 'FELIZ': return 80;
    case 'CALMO': return 60;
    case 'TRISTE': return 35;
    case 'BRAVO': return 20;
    case 'NERVOSO': return 5;
    default: return 60;
  }
}

function getEmotionFromMood(mood: number): Emotion {
  if (mood >= MOOD_THRESHOLDS.FUN) return 'FUN';
  if (mood >= MOOD_THRESHOLDS.FELIZ) return 'FELIZ';
  if (mood >= MOOD_THRESHOLDS.CALMO) return 'CALMO';
  if (mood >= MOOD_THRESHOLDS.TRISTE) return 'TRISTE';
  if (mood >= MOOD_THRESHOLDS.BRAVO) return 'BRAVO';
  return 'NERVOSO';
}

function emotionMultiplier(emotion: Emotion): number {
  switch (emotion) {
    case 'FUN': return 2;
    case 'FELIZ': return 1.5;
    case 'CALMO': return 1;
    case 'TRISTE': return 0.8;
    case 'BRAVO': return 0.5;
    case 'NERVOSO': return 0.2;
    default: return 1;
  }
}

function emotionLabel(emotion: Emotion): string {
  return emotion; // Simplificado para retornar a string direta
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

/* ================= COMPONENT ================= */
export default function SliviPulse({ emotion }: Props) {
  // Refs
  const y = useRef(SCREEN_HEIGHT / 2);
  const velocity = useRef(0);
  const pressing = useRef(false);
  const time = useRef(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const bgAnim = useRef(new Animated.Value(0)).current; // 0 = Sky, 1 = Fever

  // Estados Principais
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // Sistema de Emoção Balanceada
  const [moodValue, setMoodValue] = useState(getInitialMood(emotion));
  const currentEmotion = getEmotionFromMood(moodValue);

  // Stats
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [multiplier, setMultiplier] = useState(1);

  // Entidades
  const [boxes, setBoxes] = useState<GameBox[]>([]);
  const [clouds, setClouds] = useState<Cloud[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);

  // Game Logic
  const [speed, setSpeed] = useState(4);
  const [difficultyLevel, setDifficultyLevel] = useState(0);
  const [magnetActive, setMagnetActive] = useState(false);
  const startTime = useRef<number | null>(null);

  const isFever = combo >= 10;

  /* ================= INIT CLOUDS ================= */
  useEffect(() => {
    // Gerar nuvens iniciais
    const initialClouds = Array.from({ length: 5 }).map((_, i) => ({
      id: i,
      x: new Animated.Value(Math.random() * SCREEN_WIDTH),
      y: Math.random() * (SCREEN_HEIGHT / 2),
      scale: 0.5 + Math.random() * 0.8,
      speed: 0.5 + Math.random() * 1.5,
      width: 60 + Math.random() * 60,
    }));
    setClouds(initialClouds);
  }, []);

  /* ================= BACKGROUND & CLOUD LOOP ================= */
  useEffect(() => {
    Animated.timing(bgAnim, {
      toValue: isFever ? 1 : 0,
      duration: 800,
      useNativeDriver: false,
    }).start();

    // Loop de animação das nuvens (independente do pause do jogo para dar vida ao menu)
    const cloudLoop = setInterval(() => {
      clouds.forEach(c => {
        // Move a nuvem
        let nextX = (c.x as any)._value - c.speed;
        if (nextX < -150) {
          nextX = SCREEN_WIDTH + 50; // Reseta pro outro lado
        }
        c.x.setValue(nextX);
      });
    }, 16);

    return () => clearInterval(cloudLoop);
  }, [isFever, clouds]);


  /* ================= GAME PHYSICS LOOP ================= */
  useEffect(() => {
    if (!started || gameOver) return;

    const loop = setInterval(() => {
      time.current += 0.1;

      // Slivi
      if (pressing.current) velocity.current += -1.5;
      velocity.current += GRAVITY;
      velocity.current = clamp(velocity.current, -MAX_VELOCITY, MAX_VELOCITY);
      y.current += velocity.current;

      if (y.current < -SLIVI_SIZE || y.current > SCREEN_HEIGHT) {
        handleGameOver();
        return;
      }

      // Boxes
      setBoxes(prev =>
        prev
          .map(b => {
            let nextX = b.x - speed;
            let nextY = b.y;

            if (b.oscillate && b.initialY) {
              nextY = b.initialY + Math.sin(time.current + b.offset!) * 80;
            }

            if (magnetActive && (b.type === 'POSITIVE' || b.type === 'BONUS' || b.type === 'GHOST')) {
              const dx = SLIVI_X - nextX;
              const dy = y.current - nextY;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < 400) {
                nextX += dx * 0.08;
                nextY += dy * 0.08;
              }
            }

            return { ...b, x: nextX, y: nextY };
          })
          .filter(b => b.x > -BOX_SIZE * 2)
      );
    }, 16);

    return () => clearInterval(loop);
  }, [started, gameOver, speed, magnetActive]);

  /* ================= DIFFICULTY ================= */
  useEffect(() => {
    if (!started || gameOver) return;
    const prog = setInterval(() => {
      setSpeed(s => clamp(s + 0.2, 4, 11));
      setDifficultyLevel(d => d + 1);
    }, 5000);
    return () => clearInterval(prog);
  }, [started, gameOver]);

  /* ================= SPAWN ================= */
  useEffect(() => {
    if (!started || gameOver) return;
    const spawnDelay = clamp(1200 - difficultyLevel * 60, 500, 1200);

    const spawn = setInterval(() => {
      const waveSize = isFever ? 3 : (difficultyLevel > 5 ? 2 : 1);

      for (let i = 0; i < waveSize; i++) {
        const r = Math.random();
        let type: BoxType = 'POSITIVE';
        let oscillate = false;

        if (isFever) {
          if (r > 0.8) type = 'BONUS';
          else if (r > 0.95) type = 'MAGNET';
          else type = 'POSITIVE';
        } else {
          if (difficultyLevel < 2) {
            if (r > 0.7) type = 'NEGATIVE';
          } else if (difficultyLevel < 6) {
            if (r > 0.5) type = 'NEGATIVE';
            if (r < 0.1) type = 'BONUS';
            if (r > 0.95) type = 'MAGNET';
          } else {
            if (r > 0.3) type = 'NEGATIVE';
            if (r < 0.15) type = 'GHOST';
            if (r > 0.9 && r < 0.95) type = 'MAGNET';
            if (Math.random() > 0.7) oscillate = true;
          }
        }

        const spawnY = Math.random() * (SCREEN_HEIGHT - 200) + 100;
        setBoxes(prev => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            x: SCREEN_WIDTH + i * (BOX_SIZE + 40),
            y: spawnY,
            initialY: spawnY,
            type,
            oscillate,
            offset: Math.random() * 10,
            basePoints: type === 'POSITIVE' ? 10 : type === 'GHOST' ? 50 : 0,
          },
        ]);
      }
    }, spawnDelay);
    return () => clearInterval(spawn);
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

  function resolveBox(box: GameBox) {
    setBoxes(prev => prev.filter(b => b.id !== box.id));
    spawnParticles(box.x, box.y, getBoxColor(box.type));

    switch (box.type) {
      case 'POSITIVE': handlePositive(box); break;
      case 'GHOST': handlePositive(box); break;
      case 'NEGATIVE': handleNegative(box); break;
      case 'BONUS': handleBonus(box); break;
      case 'MAGNET': handleMagnet(box); break;
    }
  }

  /* ================= HANDLERS MOOD & SCORE ================= */
  function updateMood(amount: number) {
    setMoodValue(prev => clamp(prev + amount, 0, 100));
  }

  function handlePositive(box: GameBox) {
    const nextCombo = combo + 1;
    setCombo(nextCombo);
    updateMood(4); // Pequeno boost de felicidade

    const feverMult = isFever ? 2 : 1;
    const base = box.basePoints || 10;

    // Usa currentEmotion (derivado do moodValue)
    const finalPoints = Math.round(
      base *
      emotionMultiplier(currentEmotion) *
      (1 + nextCombo * 0.1) *
      multiplier *
      feverMult
    );

    setScore(s => s + finalPoints);
    spawnFloatingText(box.x, box.y, `+${finalPoints}`, COLORS.POSITIVE);
  }

  function handleNegative(box: GameBox) {
    if (isFever) return;

    triggerShake();
    setCombo(0);
    setMistakes(m => m + 1);
    updateMood(-20); // Dano grande no humor

    spawnFloatingText(box.x, box.y, 'DANO!', COLORS.NEGATIVE);

    if (mistakes + 1 >= MAX_MISTAKES) {
      handleGameOver();
    }
  }

  function handleBonus(box: GameBox) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setScore(s => s + 100);
    setCombo(c => c + 2);
    updateMood(10); // Grande boost de felicidade
    spawnFloatingText(box.x, box.y, 'BONUS!', COLORS.BONUS);
  }

  function handleMagnet(box: GameBox) {
    setMagnetActive(true);
    spawnFloatingText(box.x, box.y, 'MAGNETIC!', COLORS.MAGNET);
    updateMood(5);
    setTimeout(() => setMagnetActive(false), 5000);
  }

  async function handleGameOver() {
    setGameOver(true);
    triggerShake();
    updateMood(-100);
  }

  /* ================= VISUALS ================= */
  function triggerShake() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }


  function spawnParticles(x: number, y: number, color: string) {
    const newParticles: Particle[] = Array.from({ length: 6 }).map((_, i) => ({
      id: Math.random().toString(),
      x: new Animated.Value(x + BOX_SIZE / 2),
      y: new Animated.Value(y + BOX_SIZE / 2),
      opacity: new Animated.Value(1),
      color
    }));

    setParticles(prev => [...prev, ...newParticles]);

    newParticles.forEach(p => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 50;

      Animated.parallel([
        Animated.timing(p.x, {
          toValue: (p.x as any)._value + Math.cos(angle) * dist,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(p.y, {
          toValue: (p.y as any)._value + Math.sin(angle) * dist,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(p.opacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        })
      ]).start(() => setParticles(prev => prev.filter(item => item.id !== p.id)));
    });
  }

  function spawnFloatingText(x: number, y: number, text: string, color: string) {
    const id = Date.now() + Math.random();
    const translateY = new Animated.Value(0);
    const opacity = new Animated.Value(1);

    setFloatingTexts(prev => [...prev, { id, x, y, text, color, translateY, opacity }]);

    Animated.parallel([
      Animated.timing(translateY, { toValue: -60, duration: 800, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start(() => setFloatingTexts(prev => prev.filter(t => t.id !== id)));
  }

  /* ================= RESTART ================= */
  function restart() {
    setStarted(false);
    setGameOver(false);
    setScore(0);
    setCombo(0);
    setMultiplier(1);
    setSpeed(4);
    setDifficultyLevel(0);
    setMistakes(0);

    // Reseta mood
    setMoodValue(getInitialMood(emotion));

    setBoxes([]);
    setFloatingTexts([]);
    setParticles([]);
    setMagnetActive(false);
    y.current = SCREEN_HEIGHT / 2;
    velocity.current = 0;
    startTime.current = null;
  }

  function getBoxColor(type: BoxType) { return COLORS[type] || '#fff'; }

  /* ================= RENDER ================= */
  const backgroundColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.SKY_BG, COLORS.FEVER_BG]
  });

  // Interpolação para escurecer as nuvens no modo Fever
  const cloudOpacity = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.2] // Nuvens quase somem no Fever
  });

  return (
    <Pressable
      style={{ flex: 1 }}
      onPressIn={() => {
        if (gameOver) return;
        if (!started) { setStarted(true); startTime.current = Date.now(); }
        pressing.current = true;
      }}
      onPressOut={() => pressing.current = false}
      onPress={gameOver ? restart : undefined}
    >
      <Animated.View style={[styles.container, {
        backgroundColor,
        transform: [{ translateX: shakeAnim }]
      }]}>

        {/* === NUVENS (BACKGROUND LAYER) === */}
        {clouds.map(c => (
          <Animated.View
            key={c.id}
            style={[
              styles.cloud,
              {
                left: c.x,
                top: c.y,
                width: c.width,
                opacity: cloudOpacity, // Some no Fever Mode
                transform: [
                  { translateX: c.x }, // O valor animado deve entrar aqui
                  { scale: c.scale }
                ]
              }
            ]}
          >
            {/* Shapes para formar a nuvem */}
            <View style={styles.cloudBubbleMain} />
            <View style={[styles.cloudBubble, { left: -15, top: 10 }]} />
            <View style={[styles.cloudBubble, { right: -15, top: 10 }]} />
          </Animated.View>
        ))}

        {/* === EFEITOS DE FEVER === */}
        {isFever && <View style={styles.feverOverlay} />}

        {/* === HUD === */}
        <View style={styles.hudTop}>
          <View>
            <Text style={styles.hudText}>
              Emoção Atual: {emotionLabel(currentEmotion)} (x{emotionMultiplier(currentEmotion)})
            </Text>
            {/* Barra de Vida */}
            <View style={{ flexDirection: 'row', marginTop: 4 }}>
              {Array.from({ length: MAX_MISTAKES }).map((_, i) => (
                <Text key={i} style={{ opacity: i < (MAX_MISTAKES - mistakes) ? 1 : 0.2 }}>❤️</Text>
              ))}
            </View>
            {/* Opcional: Barra de Humor Debug */}
            {/* <View style={{width: 100, height: 4, backgroundColor: 'rgba(0,0,0,0.2)', marginTop: 5}}>
                <View style={{width: moodValue, height: 4, backgroundColor: '#fff'}} />
            </View> */}
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.score, { color: isFever ? COLORS.BONUS : '#fff' }]}>
              {score}
            </Text>
            {isFever && <Text style={styles.feverText}>FEVER MODE!</Text>}
            {magnetActive && <Text style={styles.magnetText}>MAGNET ON</Text>}
          </View>
        </View>

        {/* === SLIVI === */}
        <View style={{
          position: 'absolute',
          top: y.current, left: SLIVI_X,
          width: SLIVI_SIZE, height: SLIVI_SIZE,
        }}>
          {isFever && <View style={styles.aura} />}
          <Slivi emotion={currentEmotion} size={300} />
        </View>

        {/* === PARTICLES === */}
        {particles.map(p => (
          <Animated.View key={p.id} style={[styles.particle, {
            backgroundColor: p.color, opacity: p.opacity,
            transform: [{ translateX: p.x }, { translateY: p.y }]
          }]} />
        ))}

        {/* === BOXES === */}
        {boxes.map(box => (
          <View key={box.id} style={[
            styles.box,
            {
              left: box.x, top: box.y,
              backgroundColor: getBoxColor(box.type),
              opacity: box.type === 'GHOST' ? 0.3 : 1,
              borderColor: box.type === 'GHOST' ? '#fff' : 'transparent',
              borderWidth: box.type === 'GHOST' ? 1 : 0,
              shadowOpacity: box.type === 'MAGNET' ? 1 : 0,
              elevation: box.type === 'MAGNET' ? 10 : 0,
            },
          ]}
          >
            {box.type === 'POSITIVE' && <Text style={styles.boxText}>+{box.basePoints}</Text>}
            {box.type === 'BONUS' && <Text style={styles.boxText}>★</Text>}
            {box.type === 'MAGNET' && <Text style={styles.boxText}>🧲</Text>}
            {box.type === 'GHOST' && <Text style={styles.boxText}>👻</Text>}
            {box.type === 'NEGATIVE' && <Text style={styles.boxText}>X</Text>}
          </View>
        ))}

        {/* === FLOATING TEXTS === */}
        {floatingTexts.map(t => (
          <Animated.Text key={t.id} style={[styles.floatingText, {
            left: t.x, top: t.y, color: t.color, opacity: t.opacity,
            transform: [{ translateY: t.translateY }],
          }]}>{t.text}</Animated.Text>
        ))}

        {/* === OVERLAYS === */}
        {!started && (
          <View style={styles.centerOverlay}>
            <Text style={styles.overlayTitle}>Slivi Pulse</Text>
            <Text style={styles.overlaySubtitle}>Toque para pular</Text>
          </View>
        )}

        {gameOver && (
          <View style={styles.centerOverlay}>
            <Text style={[styles.overlayTitle, { color: COLORS.NEGATIVE }]}>GAME OVER</Text>
            <Text style={styles.overlaySubtitle}>Pontos: {score}</Text>
            <Text style={{ color: '#fff', marginTop: 10 }}>Toque para reiniciar</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },

  feverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    zIndex: -1,
  },

  // CLOUDS
  cloud: {
    position: 'absolute',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -5,
  },
  cloudBubbleMain: {
    width: '100%', height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.CLOUD,
  },
  cloudBubble: {
    position: 'absolute',
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.CLOUD,
  },

  hudTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    zIndex: 20,
  },
  hudText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
  },
  score: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
  },
  feverText: { color: COLORS.BONUS, fontWeight: 'bold', fontSize: 12 },
  magnetText: { color: COLORS.MAGNET, fontWeight: 'bold', fontSize: 12 },

  box: {
    position: 'absolute',
    width: BOX_SIZE, height: BOX_SIZE,
    borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  boxText: { fontWeight: 'bold', color: '#0d1117', fontSize: 16 },

  floatingText: {
    position: 'absolute', fontSize: 20, fontWeight: '900',
    textShadowColor: 'black', textShadowRadius: 2,
  },

  particle: {
    position: 'absolute', width: 8, height: 8, borderRadius: 4,
  },

  centerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 30,
  },
  overlayTitle: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  overlaySubtitle: { fontSize: 18, color: '#fff' },

  aura: {
    position: 'absolute', top: -10, left: -10,
    width: SLIVI_SIZE + 20, height: SLIVI_SIZE + 20,
    borderRadius: (SLIVI_SIZE + 20) / 2,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderWidth: 2, borderColor: COLORS.BONUS,
  }
});
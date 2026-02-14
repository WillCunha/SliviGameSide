import { sendGameScore } from '@/src/services/gameService';
import { Emotion } from '@/src/types/emotions';
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
const IMPULSE = -1.2;

const SLIVI_SIZE = 40;
const SLIVI_X = 80;
const BOX_SIZE = 50;

// Configuração das novas regras
const MAX_MISTAKES = 5; // Game Over ao atingir 5 erros
const ANGRY_THRESHOLD = 2; // Fica bravo após 2 erros

/* ================= TYPES ================= */
type BoxType = 'POSITIVE' | 'NEGATIVE' | 'BONUS';

type GameBox = {
  id: number;
  x: number;
  y: number;
  type: BoxType;
  basePoints?: number;
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

type Props = {
  emotion: Emotion;
};

/* ================= HELPERS ================= */
function emotionMultiplier(emotion: Emotion): number {
  switch (emotion) {
    case 'FUN': return 2;
    case 'FELIZ': return 1.5;
    case 'CALMO': return 1;
    case 'TRISTE': return 0.7;
    case 'NERVOSO': return 0.5;
    case 'BRAVO': return 0.5;
    default: return 1;
  }
}

function emotionLabel(emotion: Emotion): string {
  switch (emotion) {
    case 'FUN': return 'DIVERTIDO';
    case 'FELIZ': return 'FELIZ';
    case 'CALMO': return 'CALMO';
    case 'TRISTE': return 'TRISTE';
    case 'BRAVO': return 'BRAVO';
    case 'NERVOSO': return 'NERVOSO';
    default: return 'NEUTRO';
  }
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

/* ================= COMPONENT ================= */
export default function SliviPulse({ emotion }: Props) {
  const y = useRef(SCREEN_HEIGHT / 2);
  const velocity = useRef(0);
  const pressing = useRef(false);

  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // Estados novos para lógica de vida e emoção dinâmica
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>(emotion);
  const [mistakes, setMistakes] = useState(0);

  const [boxes, setBoxes] = useState<GameBox[]>([]);
  const [score, setScore] = useState(0);

  const [combo, setCombo] = useState(0);
  const [multiplier, setMultiplier] = useState(1);

  const [speed, setSpeed] = useState(3);
  const [difficultyLevel, setDifficultyLevel] = useState(0);

  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  const startTime = useRef<number | null>(null);

  /* ================= GAME LOOP ================= */
  useEffect(() => {
    if (!started || gameOver) return;

    const loop = setInterval(() => {
      if (pressing.current) velocity.current += IMPULSE;

      velocity.current += GRAVITY;
      y.current += velocity.current;

      if (y.current < -SLIVI_SIZE || y.current > SCREEN_HEIGHT) {
        setGameOver(true);
        return;
      }

      setBoxes(prev =>
        prev
          .map(b => ({ ...b, x: b.x - speed }))
          .filter(b => b.x > -BOX_SIZE)
      );
    }, 16);

    return () => clearInterval(loop);
  }, [started, gameOver, speed]);

  /* ================= DIFFICULTY ================= */
  useEffect(() => {
    if (!started || gameOver) return;

    const prog = setInterval(() => {
      setSpeed(s => clamp(s + 0.3, 3, 8));
      setDifficultyLevel(d => d + 1);
    }, 5000);

    return () => clearInterval(prog);
  }, [started, gameOver]);

  /* ================= SPAWN ================= */
  useEffect(() => {
    if (!started || gameOver) return;

    const spawnDelay = clamp(1400 - difficultyLevel * 80, 600, 1400);

    const spawn = setInterval(() => {
      const wave = difficultyLevel > 4 ? 2 : 1;

      for (let i = 0; i < wave; i++) {
        const r = Math.random();
        let type: BoxType = 'POSITIVE';

        if (difficultyLevel < 2) {
          if (r > 0.65) type = 'NEGATIVE';
        } else if (difficultyLevel < 6) {
          if (r > 0.45) type = 'NEGATIVE';
          if (r < 0.1) type = 'BONUS';
        } else {
          if (r > 0.25) type = 'NEGATIVE';
          if (r < 0.1) type = 'BONUS';
        }

        setBoxes(prev => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            x: SCREEN_WIDTH + i * (BOX_SIZE + 20),
            y: Math.random() * (SCREEN_HEIGHT - 200) + 100,
            type,
            basePoints:
              type === 'POSITIVE'
                ? 10 + Math.floor(Math.random() * 5)
                : undefined,
          },
        ]);
      }
    }, spawnDelay);

    return () => clearInterval(spawn);
  }, [started, gameOver, difficultyLevel]);

  /* ================= COLLISION ================= */
  // Adicionamos currentEmotion e mistakes nas dependências para garantir estado atualizado
  useEffect(() => {
    if (!started || gameOver) return;

    boxes.forEach(box => {
      const hitX =
        box.x < SLIVI_X + SLIVI_SIZE &&
        box.x + BOX_SIZE > SLIVI_X;

      const hitY =
        box.y < y.current + SLIVI_SIZE &&
        box.y + BOX_SIZE > y.current;

      if (hitX && hitY) resolveBox(box);
    });
  }, [boxes, currentEmotion, mistakes]);

  function resolveBox(box: GameBox) {
    setBoxes(prev => prev.filter(b => b.id !== box.id));

    if (box.type === 'POSITIVE' && box.basePoints) handlePositive(box);
    
    // Lógica alterada para Negative
    if (box.type === 'NEGATIVE') handleNegative(box);
    
    if (box.type === 'BONUS') handleBonus(box);
  }

  /* ================= HANDLERS ================= */
  function handlePositive(box: GameBox) {
    const nextCombo = Math.min(combo + 1, 5);
    // Usa currentEmotion para o cálculo
    const finalPoints = Math.round(
      box.basePoints! *
      emotionMultiplier(currentEmotion) *
      (1 + nextCombo * 0.2) *
      multiplier
    );

    setScore(s => s + finalPoints);
    setCombo(nextCombo);

    spawnFloatingText(box.x, box.y, `+${finalPoints}`, '#4dff88');
  }

  function handleNegative(box: GameBox) {
    setCombo(0);
    const newMistakes = mistakes + 1;
    setMistakes(newMistakes);

    spawnFloatingText(box.x, box.y, 'DANO!', '#ff4d4d');

    // Regra 1: Mudar emoção se pegar X caixas ruins
    if (newMistakes >= ANGRY_THRESHOLD && currentEmotion !== 'BRAVO') {
      setCurrentEmotion('BRAVO');
      spawnFloatingText(SLIVI_X, y.current - 40, 'GRRR!', '#ff4d4d');
    }

    // Regra 2: Game Over se exceder limite
    if (newMistakes >= MAX_MISTAKES) {
      setGameOver(true);
    }
  }

  function handleBonus(box: GameBox) {
    setScore(s => s + 50);
    spawnFloatingText(box.x, box.y, '+50', '#ffd700');

    setMultiplier(2);
    spawnFloatingText(SLIVI_X, y.current - 20, 'x2', '#ffd700');

    setTimeout(() => setMultiplier(1), 5000);
  }

  /* ================= FLOATING ================= */
  function spawnFloatingText(
    x: number,
    y: number,
    text: string,
    color: string
  ) {
    const id = Date.now() + Math.random();
    const translateY = new Animated.Value(0);
    const opacity = new Animated.Value(1);

    setFloatingTexts(prev => [
      ...prev,
      { id, x, y, text, color, translateY, opacity },
    ]);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -40,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== id));
    });
  }

  /* ================= INPUT ================= */
  function pressIn() {
    if (gameOver) return;
    if (!started) {
      setStarted(true);
      startTime.current = Date.now();
    }
    pressing.current = true;
  }

  function pressOut() {
    pressing.current = false;
  }

  /* ================= GAME OVER ================= */
  useEffect(() => {
    if (gameOver && started && startTime.current) {
      const game = "SLIVI_PULSE";
      const duration = Math.round(
        (Date.now() - startTime.current) / 1000
      );
      sendGameScore(game, score, duration);
    }
  }, [gameOver]);

  function restart() {
    setStarted(false);
    setGameOver(false);
    setScore(0);
    setCombo(0);
    setMultiplier(1);
    setSpeed(3);
    setDifficultyLevel(0);
    
    // Resetar novos estados
    setMistakes(0);
    setCurrentEmotion(emotion); // Volta para a emoção original
    
    setBoxes([]);
    setFloatingTexts([]);
    y.current = SCREEN_HEIGHT / 2;
    velocity.current = 0;
    startTime.current = null;
  }

  /* ================= RENDER ================= */
  return (
    <Pressable
      style={styles.container}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={gameOver ? restart : undefined}
    >
      {/* HUD EMOÇÃO & VIDAS */}
      <View style={styles.hudEmotion}>
        <Text style={styles.hudText}>
          Emoção Atual: {emotionLabel(currentEmotion)} x{emotionMultiplier(currentEmotion)}
        </Text>
        {/* Barra de vida simples */}
        <Text style={[styles.hudText, { color: '#ff4d4d', marginTop: 4 }]}>
          Vidas: {'❤️'.repeat(Math.max(0, MAX_MISTAKES - mistakes))}
        </Text>
      </View>

      {/* Renderiza o Slivi com a currentEmotion dinâmica */}
      <View
        style={{
          position: 'absolute',
          top: y.current,
          left: SLIVI_X,
          width: SLIVI_SIZE,
          height: SLIVI_SIZE,
        }}
      >
        <Slivi emotion={currentEmotion} size={300} />
      </View>

      {boxes.map(box => (
        <View
          key={box.id}
          style={[
            styles.box,
            {
              left: box.x,
              top: box.y,
              backgroundColor:
                box.type === 'POSITIVE'
                  ? '#4dff88'
                  : box.type === 'NEGATIVE'
                    ? '#ff4d4d'
                    : '#ffd700',
            },
          ]}
        >
          {box.type === 'POSITIVE' && (
            <Text style={styles.boxText}>
              +{box.basePoints}
            </Text>
          )}
        </View>
      ))}

      {floatingTexts.map(t => (
        <Animated.Text
          key={t.id}
          style={{
            position: 'absolute',
            left: t.x,
            top: t.y,
            color: t.color,
            fontSize: 18,
            fontWeight: 'bold',
            opacity: t.opacity,
            transform: [{ translateY: t.translateY }],
          }}
        >
          {t.text}
        </Animated.Text>
      ))}

      <View style={styles.hudPontos}>
        <Text style={styles.score}>Pontos: {score}</Text>
      </View>


      {!started && (
        <Text style={styles.overlay}>Toque para começar</Text>
      )}

      {gameOver && (
        <View style={{ position: 'absolute', top: '40%', alignSelf: 'center', alignItems: 'center' }}>
          <Text style={[styles.overlay, { position: 'relative', top: 0 }]}>
            Game Over
          </Text>
          <Text style={{ color: '#ff4d4d', fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
            {mistakes >= MAX_MISTAKES ? 'Muitos erros!' : 'Caiu no vazio!'}
          </Text>
          <Text style={{ color: '#fff', fontSize: 16 }}>Toque para reiniciar</Text>
        </View>
      )}
    </Pressable>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },

  hudEmotion: {
    position: 'absolute',
    top: 40,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 20,
    alignItems: 'flex-end',
  },
  hudPontos: {
    position: 'absolute',
    top: 40,
    left: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 20,
  },
  hudText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  box: {
    position: 'absolute',
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxText: {
    fontWeight: 'bold',
    color: '#0d1117',
  },
  score: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  overlay: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
});
import { sendGameResult } from '@/src/services/gameService';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Slivi from '../slivi';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/* =====================
   CONFIG
===================== */
const GRAVITY = 0.6;
const BASE_IMPULSE = -1.2;
const BOX_SPEED = 3;

const SLIVI_SIZE = 40;
const SLIVI_X = 80;
const BOX_SIZE = 50;

const EMOTION_MIN = -100;
const EMOTION_MAX = 100;

/* =====================
   TIPOS
===================== */
type EmotionState = 'FUN' | 'FELIZ' | 'CALMO' | 'TRISTE' | 'BRAVO';

type BoxType = 'POSITIVE' | 'NEGATIVE';

interface GameBox {
  id: number;
  x: number;
  y: number;
  type: BoxType;
}

/* =====================
   EMOÇÃO
===================== */
function clampEmotion(value: number) {
  return Math.max(EMOTION_MIN, Math.min(EMOTION_MAX, value));
}

function emotionFromValue(value: number): EmotionState {
  if (value >= 60) return 'FUN';
  if (value >= 20) return 'FELIZ';
  if (value > -20) return 'CALMO';
  if (value > -60) return 'TRISTE';
  return 'BRAVO';
}

function emotionModifiers(value: number) {
  if (value >= 60) return { impulse: 1.2, gravity: 1 };
  if (value >= 20) return { impulse: 1.1, gravity: 1 };
  if (value > -20) return { impulse: 1, gravity: 1 };
  if (value > -60) return { impulse: 0.9, gravity: 1.2 };
  return { impulse: 0.85, gravity: 1.3 };
}

/* =====================
   COMPONENTE
===================== */
export default function SliviPulse() {
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const y = useRef(SCREEN_HEIGHT / 2);
  const velocity = useRef(0);

  const [boxes, setBoxes] = useState<GameBox[]>([]);
  const [score, setScore] = useState(0);

  const [emotionValue, setEmotionValue] = useState(0);

  const pressing = useRef(false);
  const startTime = useRef<number | null>(null);

  const emotionState = emotionFromValue(emotionValue);

  /* =====================
     LOOP
  ===================== */
  useEffect(() => {
    if (!started || gameOver) return;

    const loop = setInterval(() => {
      const mod = emotionModifiers(emotionValue);

      if (pressing.current) {
        velocity.current += BASE_IMPULSE * mod.impulse;
      }

      velocity.current += GRAVITY * mod.gravity;
      y.current += velocity.current;

      if (y.current > SCREEN_HEIGHT || y.current < -SLIVI_SIZE) {
        setGameOver(true);
      }

      setBoxes(prev =>
        prev
          .map(b => ({ ...b, x: b.x - BOX_SPEED }))
          .filter(b => b.x > -BOX_SIZE)
      );
    }, 16);

    return () => clearInterval(loop);
  }, [started, gameOver, emotionValue]);

  /* =====================
     SPAWN DE CAIXAS
  ===================== */
  useEffect(() => {
    if (!started || gameOver) return;

    const spawn = setInterval(() => {
      setBoxes(prev => [
        ...prev,
        {
          id: Date.now(),
          x: SCREEN_WIDTH,
          y: Math.random() * (SCREEN_HEIGHT - 200) + 100,
          type: Math.random() > 0.65 ? 'NEGATIVE' : 'POSITIVE',
        }
      ]);
    }, 1400);

    return () => clearInterval(spawn);
  }, [started, gameOver]);

  /* =====================
     COLISÃO
  ===================== */
  useEffect(() => {
    if (!started || gameOver) return;

    boxes.forEach(box => {
      const hitX =
        box.x < SLIVI_X + SLIVI_SIZE &&
        box.x + BOX_SIZE > SLIVI_X;
      const hitY =
        box.y < y.current + SLIVI_SIZE &&
        box.y + BOX_SIZE > y.current;

      if (hitX && hitY) handleBox(box);
    });
  }, [boxes, started, gameOver]);

  function handleBox(box: GameBox) {
    setBoxes(prev => prev.filter(b => b.id !== box.id));

    if (box.type === 'NEGATIVE') {
      velocity.current += 6;
      setEmotionValue(v => clampEmotion(v - 15));
    } else {
      setScore(s => s + 1);
      setEmotionValue(v => clampEmotion(v + 10));
    }
  }

  /* =====================
     INPUT
  ===================== */
  function onPressIn() {
    if (gameOver) return;
    if (!started) {
      setStarted(true);
      startTime.current = Date.now();
    }
    pressing.current = true;
  }

  function onPressOut() {
    pressing.current = false;
  }

  /* =====================
     GAME OVER
  ===================== */
  useEffect(() => {
    if (!gameOver || !startTime.current) return;

    const duration = Math.round(
      (Date.now() - startTime.current) / 1000
    );

    sendGameResult({
      score,
      duration,
      finalEmotionValue: emotionValue,
      finalEmotionState: emotionState,
    });
  }, [gameOver]);

  function restart() {
    setStarted(false);
    setGameOver(false);
    setScore(0);
    setEmotionValue(0);
    setBoxes([]);
    y.current = SCREEN_HEIGHT / 2;
    velocity.current = 0;
    startTime.current = null;
  }

  /* =====================
     RENDER
  ===================== */
  return (
    <Pressable
      style={styles.container}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={gameOver ? restart : undefined}
    >
      <View
        style={{
          position: 'absolute',
          top: y.current,
          left: SLIVI_X,
          width: SLIVI_SIZE,
          height: SLIVI_SIZE,
        }}
      >
        <Slivi emotion={emotionState} size={300} />
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
                box.type === 'NEGATIVE' ? '#ff4d4d' : '#4dff88',
            },
          ]}
        />
      ))}

      <Text style={styles.score}>{score}</Text>

      {!started && <Text style={styles.overlay}>Toque para começar</Text>}
      {gameOver && (
        <Text style={styles.overlay}>
          Game Over{'\n'}Toque para reiniciar
        </Text>
      )}
    </Pressable>
  );
}

/* =====================
   STYLES
===================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  box: {
    position: 'absolute',
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: 8,
  },
  score: {
    position: 'absolute',
    top: 40,
    alignSelf: 'center',
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  overlay: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    fontSize: 24,
    color: '#fff',
    textAlign: 'center',
  },
});

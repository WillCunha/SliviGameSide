import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width, height } = Dimensions.get('window');
const FOOTER_ICON_SIZE = 50;
const PHONE_ICON_SIZE = 40;
const SLIVI_TARGET_AREA = 350;

const PHONE_FRONT_IMAGE = require('@/assets/images/components/mobiles/celular.png');
const PHONE_BACK_IMAGE = require('@/assets/images/components/mobiles/blue.png');

const PRAISE_WORDS = ['FANTÁSTICO!', 'RÁPIDO!', 'IMPRESSIONANTE!', 'DEMAIS!', 'BOA!', 'PERFEITO!'];
const getRandomPraise = () => PRAISE_WORDS[Math.floor(Math.random() * PRAISE_WORDS.length)];

interface PhoneMinigameProps {
  onGameStart?: () => void;
  onGameEnd: (score: number) => void;
  onSliviReaction?: (reaction: 'praise' | 'miss' | 'bomb') => void;
  isLightOn: boolean;
}

type GamePhase = 'IDLE' | 'DRAGGING' | 'COUNTDOWN' | 'PLAYING';

export default function PhoneMinigame({ onGameStart, onGameEnd, onSliviReaction, isLightOn }: PhoneMinigameProps) {
  const [phase, setPhase] = useState<GamePhase>('IDLE');
  const [countdown, setCountdown] = useState<number | string | null>(null);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [activeNodes, setActiveNodes] = useState<any[]>([]);
  const [floatingScores, setFloatingScores] = useState<any[]>([]);

  const nodesRef = useRef<any[]>([]);
  const phaseRef = useRef(phase);
  const scoreRef = useRef(0);
  const gameLoopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSpawnRate = useRef(2500);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const pan = useRef(new Animated.ValueXY()).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const whiteOverlayOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => phaseRef.current === 'IDLE' && isLightOn,
      onPanResponderGrant: () => {
        setPhase('DRAGGING');
        pan.setValue({ x: 0, y: 0 });
        Animated.spring(scaleAnim, { toValue: 1.2, useNativeDriver: true }).start();
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (e, gestureState) => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
        const dropAccepted = Math.abs(gestureState.moveY - height / 2) < SLIVI_TARGET_AREA / 2;

        if (dropAccepted) {
          startCountdown();
        } else {
          setPhase('IDLE');
        }
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      },
    })
  ).current;

  // --- LÓGICA DO CONTADOR ---
  const startCountdown = () => {
    setPhase('COUNTDOWN');
    if (onGameStart) {
      onGameStart();
    }; // Avisa a Home para silenciar

    let timer = 3;
    setCountdown(timer);

    const interval = setInterval(() => {
      timer -= 1;
      if (timer > 0) {
        setCountdown(timer);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (timer === 0) {
        setCountdown('JÁ!');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        clearInterval(interval);
        setCountdown(null);
        setPhase('PLAYING');
        startGameLoop();
      }
    }, 1000);
  };

  const startGameLoop = () => {
    setScore(0);
    scoreRef.current = 0;
    setMisses(0);
    nodesRef.current = [];
    setActiveNodes([]);
    currentSpawnRate.current = 2500;

    Animated.timing(whiteOverlayOpacity, {
      toValue: 0.9,
      duration: 20000,
      useNativeDriver: true,
    }).start();

    scheduleNextNode();
  };

  const scheduleNextNode = () => {
    if (gameLoopTimeoutRef.current) clearTimeout(gameLoopTimeoutRef.current);
    gameLoopTimeoutRef.current = setTimeout(() => {
      if (phaseRef.current === 'PLAYING') {
        spawnNode();
        currentSpawnRate.current = Math.max(600, currentSpawnRate.current - 25);
        scheduleNextNode();
      }
    }, currentSpawnRate.current);
  };

  const spawnNode = () => {
    const hasHoldNode = nodesRef.current.some(n => n.type === 'hold');
    if (hasHoldNode || nodesRef.current.length >= 2) return;

    const id = Math.random().toString(36).substring(2, 9);
    const seed = Math.random();
    let type: 'tap' | 'hold' | 'bomb' = seed > 0.9 ? 'bomb' : seed > 0.7 ? 'hold' : 'tap';

    const newNode = {
      id,
      type,
      x: Math.floor(Math.random() * (width - 120)) + 30,
      y: Math.floor(Math.random() * (height - 400)) + 150
    };

    nodesRef.current = [...nodesRef.current, newNode];
    setActiveNodes([...nodesRef.current]);
  };

  const handleScore = (id: string, x: number, y: number, isHold: boolean) => {
    nodesRef.current = nodesRef.current.filter(n => n.id !== id);
    setActiveNodes([...nodesRef.current]);
    setScore(s => {
      scoreRef.current = s + 10;
      return scoreRef.current;
    });
    setFloatingScores(prev => [...prev, { id, x, y, text: isHold ? getRandomPraise() : '+10' }]);
    if (isHold && onSliviReaction) {
      onSliviReaction('praise');
    }
    setTimeout(() => setFloatingScores(prev => prev.filter(f => f.id !== id)), 1000);
  };

  const handleMiss = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    nodesRef.current = nodesRef.current.filter(n => n.id !== id);
    setActiveNodes([...nodesRef.current]);
    if (onSliviReaction) onSliviReaction('miss'); // NOVO: Avisa que errou
    setMisses(m => {
      if (m + 1 >= 3) endGame(scoreRef.current);
      return m + 1;
    });
  };

  const endGame = (finalScore: number) => {
    if (gameLoopTimeoutRef.current) clearTimeout(gameLoopTimeoutRef.current);
    setPhase('IDLE');
    Animated.timing(whiteOverlayOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start();
    Alert.alert("Game Over", `Score: ${finalScore}`);
    onGameEnd(finalScore);
  };
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {phase === 'COUNTDOWN' && (
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownText}>{countdown}</Text>
          <Text style={styles.prepareText}>PREPARE-SE!</Text>
        </View>
      )}

      {phase !== 'PLAYING' && phase !== 'COUNTDOWN' && (
        <View style={styles.footerButtonContainer} pointerEvents="box-none">
          <Animated.View {...panResponder.panHandlers} style={[styles.dragPhoneContainer, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: scaleAnim }] }]}>
            <Image source={PHONE_FRONT_IMAGE} style={styles.phoneIcon} resizeMode="contain" />
          </Animated.View>
        </View>
      )}

      {phase === 'PLAYING' && (
        <View style={styles.playingOverlay} pointerEvents="box-none">
          <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'white', opacity: whiteOverlayOpacity, zIndex: 330 }]} pointerEvents="none" />
          <View style={styles.sliviPhoneContainer} pointerEvents="none">
            <Image source={PHONE_BACK_IMAGE} style={styles.phoneIconHeld} resizeMode="contain" />
          </View>
          <View style={styles.hudContainer}>
            <Text style={styles.scoreText}>SCORE: {score}</Text>
            <Text style={styles.missesText}>ERROS: {misses}/3</Text>
          </View>
          {floatingScores.map(f => <FloatingScore key={f.id} {...f} />)}
          {activeNodes.map(node => (
            <GameNode
              key={node.id}
              node={node}
              onScore={handleScore}
              onMiss={handleMiss}
              onBombClick={() => endGame(scoreRef.current)} // CORREÇÃO DO ERRO AQUI
              onBombMiss={(id) => {
                nodesRef.current = nodesRef.current.filter(n => n.id !== id);
                if (onSliviReaction) onSliviReaction('bomb'); // NOVO: Avisa da bomba
                endGame(scoreRef.current);
                setActiveNodes([...nodesRef.current]);
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ==============================================================================
// SUBCOMPONENTES (Para deixar tudo animado e limpo)
// ==============================================================================

// 1. O Texto Flutuante (+10)
const FloatingScore = ({ x, y, text }: { x: number, y: number, text: string }) => {
  const animY = useRef(new Animated.Value(y)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // Se for palavra de incentivo, usa cor dourada e tamanho maior. Se for +10, cor verde.
  const isPraise = text !== '+10';
  const textColor = isPraise ? '#FFD700' : '#4AFF88';
  const textScale = isPraise ? 1.8 : 1.5;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animY, { toValue: y - 80, duration: 800, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();
  }, []);

  return (
    <Animated.Text style={[
      styles.floatingScore,
      {
        top: animY, left: x - 50, // Centraliza um pouco a palavra
        opacity,
        transform: [{ scale: textScale }],
        color: textColor
      }
    ]}>
      {text}
    </Animated.Text>
  );
};

// 2. O Botão Interativo (Com progresso de encher)
const GameNode = ({ node, onScore, onMiss, onBombClick, onBombMiss }: any) => {
  const popAnim = useRef(new Animated.Value(0)).current; // Entrada
  const fillAnim = useRef(new Animated.Value(0)).current; // Hold

  useEffect(() => {
    Animated.spring(popAnim, { toValue: 1, friction: 3, tension: 100, useNativeDriver: true }).start();

    // Vida útil dos botões:
    // Bomb: Dura 1.5s (tem que sumir rápido pra não atrapalhar)
    // Hold: dura 3s, Tap: dura 2s
    let expireTime = node.type === 'hold' ? 3000 : node.type === 'bomb' ? 1500 : 2000;

    const timeout = setTimeout(() => {
      if (node.type === 'bomb') {
        // Se a BOMBA sumiu sem clicar: SUCESSO!
        onBombMiss(node.id);
      } else {
        // Se o normal sumiu: ERRO!
        onMiss(node.id);
      }
    }, expireTime);
    return () => clearTimeout(timeout);
  }, []);

  const handleTap = () => {
    if (node.type === 'bomb') {
      // CLICOU NA BOMBA: FIM DE JOGO INSTANTÂNEO!
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      onBombClick(node.id); // Avisa pro jogo encerrar
    } else {
      // Clicou no normal: PONTO!
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      onScore(node.id, node.x, node.y, false); // false = não é hold success
    }
  };

  const handleHoldIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(fillAnim, {
      toValue: 1, duration: 800, useNativeDriver: false
    }).start(({ finished }) => {
      if (finished) {
        // SUCESSO DE HOLD: Dopamina e feedback!
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onScore(node.id, node.x, node.y, true); // true = hold success (elogio)
      }
    });
  };

  const handleHoldOut = () => {
    fillAnim.stopAnimation();
    Animated.timing(fillAnim, { toValue: 0, duration: 150, useNativeDriver: false }).start();
  };
  return (
    <Animated.View style={{ position: 'absolute', left: node.x, top: node.y, zIndex: 350, transform: [{ scale: popAnim }] }}>

      {node.type === 'tap' && (
        <TouchableOpacity onPress={handleTap} style={styles.tapNode} activeOpacity={0.5}>
          <Ionicons name="finger-print" size={32} color="#fff" />
        </TouchableOpacity>
      )}

      {/* NOVO: O BOTÃO INIMIGO (BOMBA X) */}
      {node.type === 'bomb' && (
        <TouchableOpacity onPress={handleTap} style={styles.bombNode} activeOpacity={0.2}>
          <Ionicons name="close" size={40} color="#fff" />
        </TouchableOpacity>
      )}

      {node.type === 'hold' && (
        <TouchableOpacity onPressIn={handleHoldIn} onPressOut={handleHoldOut} style={styles.holdNode} activeOpacity={0.9}>
          <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#4AFF88', borderRadius: 12, height: fillAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), bottom: 0, top: undefined }]} />
          <MaterialCommunityIcons name="gesture-tap-hold" size={32} color="#fff" style={{ zIndex: 10 }} />
        </TouchableOpacity>
      )}

    </Animated.View>
  );
};
const styles = StyleSheet.create({
  footerButtonContainer: { position: 'absolute', bottom: 40, right: 20, width: '10%', flexDirection: 'row', zIndex: 1, pointerEvents: 'box-none' },
  dragPhoneContainer: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#000', borderRadius: 15, width: FOOTER_ICON_SIZE, height: FOOTER_ICON_SIZE, alignItems: 'center', justifyContent: 'center' },
  phoneIcon: { width: PHONE_ICON_SIZE, height: PHONE_ICON_SIZE },
  playingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 300 },
  sliviPhoneContainer: { position: 'absolute', bottom: 200, alignSelf: 'center', zIndex: 320 },
  phoneIconHeld: { width: 200, height: 200 },
  hudContainer: { position: 'absolute', top: 100, alignSelf: 'center', zIndex: 360, alignItems: 'center' },
  scoreText: { fontSize: 32, fontWeight: '900', color: '#4AFF88', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },
  missesText: { fontSize: 24, fontWeight: '900', color: '#FF4A4A', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },
  countdownContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 500 },
  countdownText: { fontSize: 120, fontWeight: '900', color: '#4AFF88', textShadowColor: '#000', textShadowRadius: 10 },
  prepareText: { fontSize: 30, fontWeight: '900', color: '#fff', marginTop: 20, letterSpacing: 5 },
  tapNode: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FF9800', borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 2 },
  bombNode: { width: 65, height: 65, borderRadius: 10, backgroundColor: '#000', borderWidth: 4, borderColor: '#FF4A4A', alignItems: 'center', justifyContent: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 3 },
  holdNode: { width: 70, height: 70, borderRadius: 15, backgroundColor: '#E91E63', borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 2, overflow: 'hidden' },

  floatingScore: { position: 'absolute', fontSize: 24, fontWeight: '900', color: '#FFD700', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3, zIndex: 400 },
});
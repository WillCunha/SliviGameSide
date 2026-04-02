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

const FOOTER_ICON_SIZE = 70;
const PHONE_ICON_SIZE = 60;
const SLIVI_TARGET_AREA = 350;

const PHONE_FRONT_IMAGE = require('@/assets/images/components/mobiles/celular.png');
const PHONE_BACK_IMAGE = require('@/assets/images/components/mobiles/blue.png');

interface PhoneMinigameProps {
  onGameEnd: (score: number) => void;
  isLightOn: boolean;
}

type GamePhase = 'IDLE' | 'DRAGGING' | 'PLAYING';

export default function PhoneMinigame({ onGameEnd, isLightOn }: PhoneMinigameProps) {

  const [phase, setPhase] = useState<GamePhase>('IDLE');
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);

  // O Estado é só para renderizar a tela
  const [activeNodes, setActiveNodes] = useState<any[]>([]);
  // A REF é a "fonte da verdade" que o setTimeout vai ler
  const nodesRef = useRef<any[]>([]);

  // Efeitos visuais (textos subindo)
  const [floatingScores, setFloatingScores] = useState<any[]>([]);

  // --- CONFIGURAÇÕES DE DOPAMINA ---
  const PRAISE_WORDS = ['FANTÁSTICO!', 'RÁPIDO!', 'IMPRESSIONANTE!', 'DEMAIS!', 'BOA!', 'PERFEITO!'];
  const getRandomPraise = () => PRAISE_WORDS[Math.floor(Math.random() * PRAISE_WORDS.length)];

  const phaseRef = useRef(phase);
  const isLightOnRef = useRef(isLightOn);
  const scoreRef = useRef(0);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { isLightOnRef.current = isLightOn; }, [isLightOn]);

  const pan = useRef(new Animated.ValueXY()).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const whiteOverlayOpacity = useRef(new Animated.Value(0)).current;

  const gameLoopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSpawnRate = useRef(1500);

  // --- MOTOR DE ARRASTAR ---
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => phaseRef.current === 'IDLE' && isLightOnRef.current,
      onMoveShouldSetPanResponder: () => phaseRef.current === 'IDLE' && isLightOnRef.current,
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
          setPhase('PLAYING');
          startGameLoop();
        } else {
          setPhase('IDLE');
        }
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        setPhase('IDLE');
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      }
    })
  ).current;

  // --- MOTOR DO JOGO ---
  const startGameLoop = () => {
    setScore(0);
    scoreRef.current = 0;
    setMisses(0);
    nodesRef.current = [];
    setActiveNodes([]);
    currentSpawnRate.current = 2500; // Começa tranquilo (2.5s)

    Animated.timing(whiteOverlayOpacity, {
      toValue: 0.9,
      duration: 20000,
      useNativeDriver: true,
    }).start();

    scheduleNextNode();
  };

  const cleanupGame = () => {
    if (gameLoopTimeoutRef.current) clearTimeout(gameLoopTimeoutRef.current);
    nodesRef.current = [];
    setActiveNodes([]);
    setFloatingScores([]);
  };

  const scheduleNextNode = () => {
    if (gameLoopTimeoutRef.current) clearTimeout(gameLoopTimeoutRef.current);

    gameLoopTimeoutRef.current = setTimeout(() => {
      spawnNode();
      // Aceleração gradativa: tira 25ms por rodada
      currentSpawnRate.current = Math.max(600, currentSpawnRate.current - 25);
      scheduleNextNode();
    }, currentSpawnRate.current);
  };

  const spawnNode = () => {
    // REGRA DE OURO 1: Se já tem um botão de SEGURAR na tela, NÃO cria mais nada!
    const hasHoldNode = nodesRef.current.some(n => n.type === 'hold');
    if (hasHoldNode) return;

    // REGRA DE OURO 2: Limite máximo de 2 botões normais simultâneos.
    // (O botão bomba não conta nesse limite para ele poder 'atrapalhar' um normal)
    const normalNodes = nodesRef.current.filter(n => n.type !== 'bomb');
    if (normalNodes.length >= 2) return;

    const id = Math.random().toString(36).substring(2, 9);
    const randomSeed = Math.random();
    let nodeType: 'tap' | 'hold' | 'bomb' = 'tap';

    // LÓGICA DE SPAWN:
    if (randomSeed > 0.9) {
      // 10% de chance de nascer o INIMIGO (Botão Bomba 'X')
      nodeType = 'bomb';
    } else if (randomSeed > 0.7) {
      // 20% de chance (0.7 a 0.9) de nascer o Hold (segurar)
      nodeType = 'hold';
    }
    // O resto (70%) é Tap normal

    const randomX = Math.floor(Math.random() * (width - 120)) + 30;
    const randomY = Math.floor(Math.random() * (height - 400)) + 150;

    const newNode = { id, x: randomX, y: randomY, type: nodeType };

    nodesRef.current = [...nodesRef.current, newNode];
    setActiveNodes([...nodesRef.current]);
  };

  const handleScore = (id: string, x: number, y: number, isHoldSuccess: boolean) => {
    // Remove o botão da Ref e do Estado
    nodesRef.current = nodesRef.current.filter(n => n.id !== id);
    setActiveNodes([...nodesRef.current]);

    setScore(s => {
      const newScore = s + 10;
      scoreRef.current = newScore;
      return newScore;
    });

    // Dopamina: Cria texto flutuante. Se for sucesso de Hold, manda palavra de incentivo.
    const textToShow = isHoldSuccess ? getRandomPraise() : '+10';
    triggerFloatingScore(id, x, y, textToShow);
  };

  const handleMiss = (id: string) => {
    // Se o usuário não clicou no botão normal a tempo, perde vida
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    nodesRef.current = nodesRef.current.filter(n => n.id !== id);
    setActiveNodes([...nodesRef.current]);
    processMiss();
  };

  const processMiss = () => {
    setMisses(m => {
      const newMisses = m + 1;
      if (newMisses >= 3) {
        endGame(scoreRef.current);
      }
      return newMisses;
    });
  };

  const triggerFloatingScore = (id: string, x: number, y: number, text: string) => {
    setFloatingScores(prev => [...prev, { id, x, y, text }]);
    setTimeout(() => {
      setFloatingScores(prev => prev.filter(f => f.id !== id));
    }, 1000); // Texto fica um pouco mais na tela se for palavra longa
  };

  const endGame = (finalScore: number) => {
    cleanupGame();
    setPhase('IDLE');
    pan.setValue({ x: 0, y: 0 });

    Animated.timing(whiteOverlayOpacity, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();

    Alert.alert("Game Over!", `O celular descarregou!\nVocê fez ${finalScore} pontos.`);
    onGameEnd(finalScore);
  };

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">

      {phase !== 'PLAYING' && (
        <View style={styles.footerButtonContainer} pointerEvents="box-none">
          <Animated.View
            {...panResponder.panHandlers}
            style={[styles.dragPhoneContainer, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: scaleAnim }], opacity: phase === 'DRAGGING' ? 0.9 : 1 }]}
          >
            <Image source={PHONE_FRONT_IMAGE} style={styles.phoneIcon} resizeMode="contain" />
          </Animated.View>
        </View>
      )}

      {phase === 'PLAYING' && (
        <View style={styles.playingOverlay} pointerEvents="box-none">
          <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'white', opacity: whiteOverlayOpacity, zIndex: 310 }]} pointerEvents="none" />

          <View style={styles.sliviPhoneContainer} pointerEvents="none">
            <Image source={PHONE_BACK_IMAGE} style={styles.phoneIconHeld} resizeMode="contain" />
          </View>

          <View style={styles.hudContainer}>
            <Text style={styles.scoreText}>SCORE: {score}</Text>
            <Text style={styles.missesText}>ERROS: {misses}/3</Text>
          </View>

          {/* RENDERIZA OS TEXTOS FLUTUANTES (+10 ou Elogios) */}
          {floatingScores.map(f => (
            <FloatingScore
              key={f.id}
              x={f.x}
              y={f.y}
              text={f.text} // <--- Adicione essa linha aqui!
            />
          ))}

          {/* RENDERIZA OS BOTÕES USANDO NOSSO NOVO SUBCOMPONENTE DOPAMINÉRGICO */}
          {activeNodes.map(node => (
            <GameNode key={node.id} node={node} onScore={handleScore} onMiss={handleMiss} />
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
  footerButtonContainer: { position: 'absolute', bottom: 40, alignSelf: 'center', width: '90%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', zIndex: 200, pointerEvents: 'box-none' },
  dragPhoneContainer: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#000', borderRadius: 15, width: FOOTER_ICON_SIZE, height: FOOTER_ICON_SIZE, alignItems: 'center', justifyContent: 'center' },
  phoneIcon: { width: PHONE_ICON_SIZE, height: PHONE_ICON_SIZE },
  playingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 300 },
  sliviPhoneContainer: { position: 'absolute', bottom: 300, alignSelf: 'center', zIndex: 320 },
  phoneIconHeld: { width: 200, height: 200 },
  hudContainer: { position: 'absolute', top: 100, alignSelf: 'center', zIndex: 360, alignItems: 'center' },
  scoreText: { fontSize: 32, fontWeight: '900', color: '#4AFF88', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },
  missesText: { fontSize: 24, fontWeight: '900', color: '#FF4A4A', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },

  tapNode: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FF9800', borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 2 },
  bombNode: { width: 65, height: 65, borderRadius: 10, backgroundColor: '#000', borderWidth: 4, borderColor: '#FF4A4A', alignItems: 'center', justifyContent: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 3 },
  holdNode: { width: 70, height: 70, borderRadius: 15, backgroundColor: '#E91E63', borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 2, overflow: 'hidden' },

  floatingScore: { position: 'absolute', fontSize: 24, fontWeight: '900', color: '#FFD700', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3, zIndex: 400 },
});
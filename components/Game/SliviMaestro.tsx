import { Emotion } from '@/src/types/emotions';
import { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration, // Importamos a API de Vibração
    View
} from 'react-native';
import Slivi from '../slivi';
import River from './River';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/* =====================
   CONFIGURAÇÕES GERAIS
===================== */
const CENTER_X = SCREEN_WIDTH / 2;
const CENTER_Y = SCREEN_HEIGHT / 2;
const SLIVI_SIZE = 90;
const ITEM_SIZE = 45;
const SPAWN_RATE_BASE = 1400;
const ITEM_SPEED_BASE = 2.0;

const MAX_ENERGY = 100;
const ENERGY_COST_PER_SWIPE = 8;
const ENERGY_REGEN = 0.15;

/* =====================
   TIPOS E HELPER
===================== */
type ItemCategory = 'POSITIVE' | 'NEGATIVE';
type ItemSubType = 'ORVALHO' | 'ESTRELA' | 'FRUTA' | 'LAMA' | 'TEMPESTADE' | 'ESPINHO';

interface GameItem {
    id: number;
    x: number;
    y: number;
    category: ItemCategory;
    subType: ItemSubType;
    vx: number;
    vy: number;
    driftSeed: number;
    driftStrength: number;
    active: boolean;
}

interface SliviMaestroProps {
    initialEmotion?: Emotion;
}

function getEmotionFromValue(value: number): Emotion {
    if (value >= 80) return 'FUN';
    if (value >= 60) return 'FELIZ';
    if (value >= 40) return 'CALMO';
    if (value >= 20) return 'NEUTRO';
    if (value >= 0) return 'TRISTE';
    return 'BRAVO';
}

function getInitialConfig(emotion: Emotion) {
    switch (emotion) {
        case 'BRAVO':
        case 'NERVOSO': return { speedMult: 1.4, scoreBaseMult: 2.0 };
        case 'TRISTE':
        case 'CANSADO': return { speedMult: 0.8, scoreBaseMult: 1.2 };
        case 'FELIZ':
        case 'FUN': return { speedMult: 1.1, scoreBaseMult: 1.0 };
        default: return { speedMult: 1.0, scoreBaseMult: 1.0 };
    }
}

/* =====================
   COMPONENTE
===================== */
export default function SliviMaestro({ initialEmotion = 'NEUTRO' }: SliviMaestroProps) {
    const [started, setStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);

    const [items, setItems] = useState<GameItem[]>([]);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(1);
    const [energy, setEnergy] = useState(MAX_ENERGY);
    const [internalEmotionValue, setInternalEmotionValue] = useState(50);

    // --- NOVOS ESTADOS DE TURBULÊNCIA ---
    const [isTurbulence, setIsTurbulence] = useState(false);
    const [riverSpeed, setRiverSpeed] = useState(1.0);

    const startTime = useRef<number | null>(null);
    const config = useRef(getInitialConfig(initialEmotion));

    const currentEmotion = getEmotionFromValue(internalEmotionValue);

    /* =====================
       EVENTO SURPRESA (TURBULÊNCIA)
    ===================== */
    useEffect(() => {
        if (!started || gameOver) {
            Vibration.cancel();
            setIsTurbulence(false);
            setRiverSpeed(1.0);
            return;
        }

        let turbulenceTimer: NodeJS.Timeout;
        let nextEventTimer: NodeJS.Timeout;

        const triggerSurprise = () => {
            setIsTurbulence(true);
            setRiverSpeed(2.5); // Acelera tudo em 2.5x

            // Padrão de vibração contínua (vibra 200ms, pausa 100ms) - o `true` faz repetir
            Vibration.vibrate([100, 200], true);

            // O evento dura entre 3 e 5 segundos
            const eventDuration = Math.random() * 2000 + 3000;

            turbulenceTimer = setTimeout(() => {
                // Acaba a turbulência
                setIsTurbulence(false);
                setRiverSpeed(1.0);
                Vibration.cancel();

                // Agenda a próxima surpresa (daqui a 8 a 15 segundos)
                const nextDelay = Math.random() * 7000 + 8000;
                nextEventTimer = setTimeout(triggerSurprise, nextDelay);
            }, eventDuration);
        };

        // Agenda o primeiro evento após o jogo começar
        nextEventTimer = setTimeout(triggerSurprise, Math.random() * 5000 + 5000);

        return () => {
            clearTimeout(turbulenceTimer);
            clearTimeout(nextEventTimer);
            Vibration.cancel(); // Garante que a vibração pare se o componente desmontar
        };
    }, [started, gameOver]);

    /* =====================
       INPUT (SWIPE)
    ===================== */
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderRelease: (_, gestureState) => {
                if (!started || gameOver) return;

                // Ignora toques curtos
                if (Math.abs(gestureState.dx) < 20 && Math.abs(gestureState.dy) < 20) return;
                handleSwipe(gestureState.dx, gestureState.dy);
            },
        })
    ).current;

    // Usa uma Ref para acessar o estado isTurbulence atualizado dentro do PanResponder
    const isTurbRef = useRef(isTurbulence);
    useEffect(() => { isTurbRef.current = isTurbulence; }, [isTurbulence]);

    function handleSwipe(dx: number, dy: number) {
        // 1. MOVIMENTO PESADO: Custo de energia dobra na turbulência
        const currentCost = isTurbRef.current ? ENERGY_COST_PER_SWIPE * 2 : ENERGY_COST_PER_SWIPE;

        if (energy < currentCost) return; // Sem energia
        setEnergy(e => Math.max(0, e - currentCost));

        // 2. MOVIMENTO PESADO: Distância necessária do arrasto aumenta na turbulência
        const swipeThreshold = isTurbRef.current ? 50 : 30;

        const isHorizontal = Math.abs(dx) > Math.abs(dy);

        setItems(prevItems => {
            const newItems = [...prevItems];
            const targets = newItems
                .filter(i => i.active)
                .map(i => ({ ...i, dist: Math.sqrt(Math.pow(CENTER_X - i.x, 2) + Math.pow(CENTER_Y - i.y, 2)) }))
                .filter(i => i.dist < 180)
                .sort((a, b) => a.dist - b.dist);

            if (targets.length === 0) return newItems;

            const target = targets[0];
            const targetIndex = newItems.findIndex(i => i.id === target.id);

            let isCorrectAction = false;

            const itemIsLeft = target.x < CENTER_X;
            const itemIsTop = target.y < CENTER_Y;

            const swipeLeft = dx < -swipeThreshold;
            const swipeRight = dx > swipeThreshold;
            const swipeUp = dy < -swipeThreshold;
            const swipeDown = dy > swipeThreshold;

            // Se o swipe não atingiu a força necessária (threshold), falha automaticamente
            if (!swipeLeft && !swipeRight && !swipeUp && !swipeDown) {
                setCombo(1);
                return newItems;
            }

            if (isHorizontal) {
                if (target.category === 'POSITIVE') {
                    if (itemIsLeft && swipeLeft) isCorrectAction = true;
                    if (!itemIsLeft && swipeRight) isCorrectAction = true;
                } else {
                    if (itemIsLeft && swipeRight) isCorrectAction = true;
                    if (!itemIsLeft && swipeLeft) isCorrectAction = true;
                }
            } else {
                if (target.category === 'POSITIVE') {
                    if (itemIsTop && swipeUp) isCorrectAction = true;
                    if (!itemIsTop && swipeDown) isCorrectAction = true;
                } else {
                    if (itemIsTop && swipeDown) isCorrectAction = true;
                    if (!itemIsTop && swipeUp) isCorrectAction = true;
                }
            }

            if (isCorrectAction) {
                processItemEffect(target, true);
                newItems[targetIndex].active = false;
            } else {
                setCombo(1);
            }

            return newItems.filter(i => i.active);
        });
    }

    function processItemEffect(item: GameItem, success: boolean) {
        if (!success) {
            setCombo(1);
            setInternalEmotionValue(v => Math.max(0, v - 10));
            if (item.category === 'NEGATIVE') {
                setScore(s => Math.max(0, s - 50));
                if (item.subType === 'TEMPESTADE') setEnergy(e => Math.max(0, e - 50));
                if (item.subType === 'ESPINHO') setEnergy(e => Math.max(0, e - 20));
            }
            return;
        }

        let basePoints = 0;
        let emotionGain = 0;

        switch (item.subType) {
            case 'ORVALHO': basePoints = 10; emotionGain = 5; break;
            case 'ESTRELA': basePoints = 50; setEnergy(e => Math.min(MAX_ENERGY, e + 40)); break;
            case 'FRUTA': basePoints = 100; emotionGain = 10; break;
            case 'LAMA': basePoints = 20; break;
            case 'TEMPESTADE':
            case 'ESPINHO': basePoints = 50; break;
        }

        // MULTIPLICADOR DE RISCO: Se estiver na turbulência, ganha muito mais pontos
        const turbulenceMultiplier = isTurbRef.current ? 2.5 : 1.0;
        const points = Math.floor(basePoints * combo * config.current.scoreBaseMult * turbulenceMultiplier);

        setScore(s => s + points);
        setCombo(c => Math.min(10, c + 0.2));
        setInternalEmotionValue(v => Math.min(100, v + emotionGain));
    }

    /* =====================
       GAME LOOP
    ===================== */
    useEffect(() => {
        if (!started || gameOver) return;

        const loop = setInterval(() => {
            setEnergy(e => Math.min(MAX_ENERGY, e + ENERGY_REGEN));

            setItems(prev => {
                const nextItems: GameItem[] = [];
                prev.forEach(item => {
                    // ITENS AFETADOS PELA CORRENTEZA: vx e vy são multiplicados pela velocidade do rio
                    // Fator da turbulência
                    const turbulenceFactor = isTurbulence ? 2.2 : 1.0;

                    // Movimento base do rio
                    item.x += item.vx * riverSpeed * turbulenceFactor;
                    item.y += item.vy * riverSpeed * turbulenceFactor;

                    // 🌊 Deriva (correnteza)
                    item.driftSeed += 0.05 * riverSpeed;

                    // 🎨 (OPCIONAL, MAS LINDO) — comportamento por tipo
                    const driftMultiplier =
                        item.subType === 'ESPINHO' ? 1.6 :
                            item.subType === 'LAMA' ? 0.6 :
                                1.0;

                    const drift =
                        Math.sin(item.driftSeed) *
                        item.driftStrength *
                        driftMultiplier *
                        (isTurbulence ? 2.0 : 1.0);

                    // Aplica deriva perpendicular ao movimento
                    item.x += -item.vy * drift;
                    item.y += item.vx * drift;

                    const dist = Math.sqrt(Math.pow(CENTER_X - item.x, 2) + Math.pow(CENTER_Y - item.y, 2));

                    if (dist < SLIVI_SIZE / 2) {
                        processItemEffect(item, false);
                    } else {
                        nextItems.push(item);
                    }
                });
                return nextItems;
            });
        }, 16);

        return () => clearInterval(loop);
    }, [started, gameOver, riverSpeed]); // Depende do riverSpeed para atualizar a velocidade instantaneamente

    /* =====================
       SPAWNER
    ===================== */
    useEffect(() => {
        if (!started || gameOver) return;

        // A taxa de geração de itens também acompanha a velocidade do rio
        const currentSpawnRate = SPAWN_RATE_BASE / (config.current.speedMult * riverSpeed);

        const interval = setInterval(() => {
            const angle = Math.random() * 2 * Math.PI;
            const radius = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) / 1.5;

            const startX = CENTER_X + Math.cos(angle) * radius;
            const startY = CENTER_Y + Math.sin(angle) * radius;

            const dx = CENTER_X - startX;
            const dy = CENTER_Y - startY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const baseSpeed = ITEM_SPEED_BASE * config.current.speedMult;

            const rand = Math.random();
            let cat: ItemCategory = 'POSITIVE';
            let sub: ItemSubType = 'ORVALHO';

            if (rand > 0.6) {
                cat = 'NEGATIVE';
                if (rand > 0.9) sub = 'ESPINHO';
                else if (rand > 0.8) sub = 'TEMPESTADE';
                else sub = 'LAMA';
            } else {
                if (rand < 0.1) sub = 'FRUTA';
                else if (rand < 0.25) sub = 'ESTRELA';
                else sub = 'ORVALHO';
            }

            setItems(prev => [...prev, {
                id: Date.now(),
                x: startX,
                y: startY,
                vx: (dx / dist) * baseSpeed,
                vy: (dy / dist) * baseSpeed,
                // 🌊 Correnteza
                driftSeed: Math.random() * Math.PI * 2,
                driftStrength: Math.random() * 0.8 + 0.4,
                category: cat,
                subType: sub,
                active: true
            }]);

        }, currentSpawnRate);

        return () => clearInterval(interval);
    }, [started, gameOver, riverSpeed]);

    /* =====================
       CONTROLES DE JOGO
    ===================== */
    function startGame() {
        setStarted(true);
        setGameOver(false);
        setScore(0);
        setCombo(1);
        setItems([]);
        setEnergy(MAX_ENERGY);
        setIsTurbulence(false);
        setRiverSpeed(1.0);
        startTime.current = Date.now();
    }

    function endGame() {
        setGameOver(true);
        setStarted(false);
        Vibration.cancel();

        const duration = startTime.current ? Math.round((Date.now() - startTime.current) / 1000) : 0;
        //   sendGameScore({
        //       score, duration, finalEmotionValue: internalEmotionValue, finalEmotionState: currentEmotion
        //   });
    }

    /* =====================
       RENDER
    ===================== */
    const getItemColor = (sub: ItemSubType) => {
        switch (sub) {
            case 'ORVALHO': return '#4dff88';
            case 'ESTRELA': return '#ffd700';
            case 'FRUTA': return '#ff00ff';
            case 'LAMA': return '#8B4513';
            case 'TEMPESTADE': return '#555';
            case 'ESPINHO': return '#ff0000';
            default: return '#fff';
        }
    };

    const getItemIcon = (sub: ItemSubType) => {
        switch (sub) {
            case 'ORVALHO': return '💧';
            case 'ESTRELA': return '⭐';
            case 'FRUTA': return '🍎';
            case 'LAMA': return '💩';
            case 'TEMPESTADE': return '⛈️';
            case 'ESPINHO': return '🌵';
            default: return '';
        }
    };

    return (
        <View style={[styles.container, isTurbulence && styles.turbulenceBg]} {...panResponder.panHandlers}>
            <River
                isRunning={started && !gameOver}
                isTurbulence={isTurbulence}
            />
            {/* Aviso Visual da Turbulência */}
            {isTurbulence && <View style={styles.turbulenceWarning} />}

            <View style={styles.hud}>
                <Text style={styles.scoreText}>{score}</Text>
                <Text style={styles.comboText}>x{combo.toFixed(1)}</Text>
            </View>

            <View style={styles.centerArea}>
                <View style={[styles.energyRing, {
                    borderColor: energy < 30 ? 'red' : '#4dff88',
                    opacity: energy / 100
                }]} />
                <Slivi emotion={currentEmotion} size={SLIVI_SIZE * 1.5} />
            </View>

            {items.map(item => (
                <View key={item.id} style={[styles.item, {
                    left: item.x - ITEM_SIZE / 2,
                    top: item.y - ITEM_SIZE / 2,
                    backgroundColor: getItemColor(item.subType),
                    borderColor: item.category === 'POSITIVE' ? '#fff' : '#000'
                }]}>
                    <Text style={{ fontSize: 20 }}>{getItemIcon(item.subType)}</Text>
                </View>
            ))}

            {started && (
                <TouchableOpacity style={styles.exitBtn} onPress={endGame}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)' }}>Parar</Text>
                </TouchableOpacity>
            )}

            {!started && !gameOver && (
                <View style={styles.overlay}>
                    <Text style={styles.title}>Maestro do Orvalho</Text>
                    <Text style={styles.subTitle}>Slivi está {initialEmotion}</Text>
                    <TouchableOpacity onPress={startGame} style={styles.btn}>
                        <Text style={styles.btnText}>COMEÇAR</Text>
                    </TouchableOpacity>
                </View>
            )}

            {gameOver && (
                <View style={styles.overlay}>
                    <Text style={styles.title}>Fim de Jogo</Text>
                    <Text style={styles.scoreBig}>{score}</Text>
                    <Text style={styles.desc}>Slivi terminou {currentEmotion}</Text>
                    <TouchableOpacity onPress={startGame} style={styles.btn}>
                        <Text style={styles.btnText}>JOGAR NOVAMENTE</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

/* =====================
   ESTILOS
===================== */
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    turbulenceBg: { backgroundColor: '#0a1a2a' }, // Escurece um pouco o fundo na turbulência
    turbulenceWarning: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 5,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    hud: { position: 'absolute', top: 50, width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 30 },
    scoreText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
    comboText: { color: '#ffd700', fontSize: 24, fontWeight: 'bold' },
    scoreBig: { color: '#ffd700', fontSize: 60, fontWeight: 'bold', marginVertical: 20 },
    centerArea: { position: 'absolute', left: CENTER_X - 75, top: CENTER_Y - 75, width: 150, height: 150, justifyContent: 'center', alignItems: 'center' },
    energyRing: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 4, borderStyle: 'dashed' },
    item: { position: 'absolute', width: ITEM_SIZE, height: ITEM_SIZE, borderRadius: ITEM_SIZE / 2, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    title: { color: '#4dff88', fontSize: 30, fontWeight: 'bold', marginBottom: 10 },
    subTitle: { color: '#fff', fontSize: 20, marginBottom: 20, opacity: 0.8 },
    desc: { color: '#ccc', fontSize: 16, textAlign: 'center', marginBottom: 40, lineHeight: 24 },
    btn: { backgroundColor: '#4dff88', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30 },
    btnText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
    exitBtn: { position: 'absolute', bottom: 40, alignSelf: 'center' }
});
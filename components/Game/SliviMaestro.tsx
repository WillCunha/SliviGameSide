import { getObjectives, sendGameScore } from '@/src/services/gameService';
import { Emotion } from '@/src/types/emotions';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View
} from 'react-native';
import Slivi from '../slivi';
import River from './River';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/* =====================
   CONFIGURAÇÕES GERAIS
===================== */
const SLIVI_SIZE = 80;
const ITEM_SIZE = 45;
const SLIVI_Y = SCREEN_HEIGHT - 180;

const SPAWN_RATE_BASE = 1000;
const ITEM_SPEED_BASE = 3.5;

const MAX_ENERGY = 100;
const ENERGY_DECAY = -0.05; // 📉 Agora a energia CAI com o tempo!
const MAX_LIVES = 5;        // ❤️ Máximo de corações

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
    vy: number;
    active: boolean;
}

interface SliviMaestroProps {
    initialEmotion?: Emotion;
}

type ObjectiveCondition = {
    during_fever?: boolean; // No Maestro, o 'fever' equivale à turbulência
    used_magnet?: boolean;
};

type GameObjective = {
    id: number;
    current_value: number;
    target_value: number;
    description: string,
    type: string;
    conditions: string | null;
};

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
   COMPONENTE PRINCIPAL
===================== */
export default function SliviMaestro({ initialEmotion = 'NEUTRO' }: SliviMaestroProps) {
    const [started, setStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);

    const [items, setItems] = useState<GameItem[]>([]);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(1);
    const [energy, setEnergy] = useState(MAX_ENERGY);
    const [lives, setLives] = useState(MAX_LIVES); // ❤️ Estado das vidas
    const [internalEmotionValue, setInternalEmotionValue] = useState(50);

    const [isTurbulence, setIsTurbulence] = useState(false);
    const [riverSpeed, setRiverSpeed] = useState(1.0);

    const [objectives, setObjectives] = useState<GameObjective[]>([]);

    //STATS
    const [stats, setStats] = useState({
        total_boxes: 0,
        bonus_boxes: 0,
        magnetic_boxes: 0,
        ghost_boxes: 0,
        used_magnet: false,
        during_fever: false,
        run_duration: 0,
    });

    const sliviX = useRef(SCREEN_WIDTH / 2 - SLIVI_SIZE / 2);
    const startTime = useRef<number | null>(null);
    const config = useRef(getInitialConfig(initialEmotion));

    const currentEmotion = getEmotionFromValue(internalEmotionValue);

    const startedRef = useRef(started);
    const gameOverRef = useRef(gameOver);

    // 🧠 Ref para ler o score atualizado dentro do spawner
    const scoreRef = useRef(score);

    useEffect(() => { startedRef.current = started; }, [started]);
    useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
    useEffect(() => { scoreRef.current = score; }, [score]);

    /* =====================
       VERIFICADOR DE GAME OVER
    ===================== */
    useEffect(() => {
        if (started && !gameOver) {
            if (energy <= 0 || lives <= 0) {
                setGameOver(true);

                const duration =
                    startTime.current
                        ? Math.floor((Date.now() - startTime.current) / 1000)
                        : 0;


                const payload = {
                    game: 'maestro',
                    score,
                    duration,
                    finalEmotionValue: internalEmotionValue,
                    finalEmotionState: currentEmotion,
                    stats: {
                        score: score,
                        ...stats,
                        run_duration: duration,
                    },
                }

                sendGameScore({
                    game: 'maestro',
                    score,
                    duration,
                    finalEmotionValue: internalEmotionValue,
                    finalEmotionState: currentEmotion,
                    stats: {
                        matches_played: 1,                 // <--- NOVO: Pro selo acumulativo de partidas
                        total_navigation_time: duration,   // <--- NOVO: Pro selo de tempo total no rio
                        score: score,
                        ...stats,
                        run_duration: duration,
                    },
                });

                console.log("dados do game: ", payload)
            }
        }
    }, [energy, lives, started, gameOver]);

    /* =====================
       EVENTO DE TURBULÊNCIA
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
            setRiverSpeed(2.2);
            Vibration.vibrate([100, 200], true);

            const eventDuration = Math.random() * 2000 + 3000;

            turbulenceTimer = setTimeout(() => {
                setIsTurbulence(false);
                setRiverSpeed(1.0);
                Vibration.cancel();

                const nextDelay = Math.random() * 8000 + 7000;
                nextEventTimer = setTimeout(triggerSurprise, nextDelay);
            }, eventDuration);
        };

        nextEventTimer = setTimeout(triggerSurprise, 6000);

        return () => {
            clearTimeout(turbulenceTimer);
            clearTimeout(nextEventTimer);
            Vibration.cancel();
        };
    }, [started, gameOver]);

    /* =====================
       INPUT (MOVER PARA OS LADOS)
    ===================== */
    const isTurbRef = useRef(isTurbulence);
    useEffect(() => { isTurbRef.current = isTurbulence; }, [isTurbulence]);

    const sliviStartX = useRef(sliviX.current);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                sliviStartX.current = sliviX.current;
            },
            onPanResponderMove: (_, gestureState) => {
                if (!startedRef.current || gameOverRef.current) return;

                let targetX = sliviStartX.current + gestureState.dx;
                targetX = Math.max(0, Math.min(SCREEN_WIDTH - SLIVI_SIZE, targetX));

                if (isTurbRef.current) {
                    sliviX.current += (targetX - sliviX.current) * 0.1;
                } else {
                    sliviX.current = targetX;
                }
            },
        })
    ).current;

    /* =====================
       COLISÃO E EFEITOS
    ===================== */
    function processItemEffect(item: GameItem, collided: boolean) {

        if (item.category === 'POSITIVE') {
            if (collided) {
                let basePoints = item.subType === 'ESTRELA' ? 50 : (item.subType === 'FRUTA' ? 100 : 10);
                let emotionGain = item.subType === 'ESTRELA' ? 0 : 5;

                // ⚡ Como a energia cai sozinha, todos os itens positivos curam um pouquinho pra ajudar
                if (item.subType === 'ESTRELA') setEnergy(e => Math.min(MAX_ENERGY, e + 40));
                else if (item.subType === 'FRUTA') setEnergy(e => Math.min(MAX_ENERGY, e + 10));
                else setEnergy(e => Math.min(MAX_ENERGY, e + 3));

                const turbulenceMult = isTurbRef.current ? 2.5 : 1.0;
                setScore(s => s + Math.floor(basePoints * combo * config.current.scoreBaseMult * turbulenceMult));
                setCombo(c => Math.min(10, c + 0.2));
                setInternalEmotionValue(v => Math.min(100, v + emotionGain));

                setStats(s => ({
                    ...s,
                    total_boxes: s.total_boxes + 1,
                    bonus_boxes:
                        item.subType === 'FRUTA' || item.subType === 'ESTRELA'
                            ? s.bonus_boxes + 1
                            : s.bonus_boxes,
                    during_fever: isTurbRef.current ? true : s.during_fever,
                }));
            } else {
                setCombo(1);
            }
        } else {
            if (collided) {
                setCombo(1);
                setInternalEmotionValue(v => Math.max(0, v - 10));
                setScore(s => Math.max(0, s - 30));

                setStats(s => ({
                    ...s,
                    ghost_boxes: item.subType === 'LAMA'
                        ? s.ghost_boxes + 1
                        : s.ghost_boxes
                }));

                if (item.subType === 'TEMPESTADE') setEnergy(e => Math.max(0, e - 50));
                if (item.subType === 'ESPINHO') setEnergy(e => Math.max(0, e - 20));

                // ❤️ Punição severa: bateu no negativo, perde uma vida!
                setLives(l => l - 1);
                Vibration.vibrate(200);
            } else {
                setScore(s => s + 5);
            }
        }
    }

    /* =====================
       GAME LOOP E FÍSICA
    ===================== */
    useEffect(() => {
        if (!started || gameOver) return;

        const loop = setInterval(() => {
            // 📉 Decaimento constante de energia
            setEnergy(e => Math.max(0, e + ENERGY_DECAY));

            setItems(prev => {
                const nextItems: GameItem[] = [];

                prev.forEach(item => {
                    item.y += item.vy * riverSpeed;

                    const hitX = item.x < sliviX.current + SLIVI_SIZE && item.x + ITEM_SIZE > sliviX.current;
                    const hitY = item.y < SLIVI_Y + SLIVI_SIZE && item.y + ITEM_SIZE > SLIVI_Y;

                    if (hitX && hitY) {
                        processItemEffect(item, true);
                    } else if (item.y > SCREEN_HEIGHT) {
                        processItemEffect(item, false);
                    } else {
                        nextItems.push(item);
                    }
                });

                return nextItems;
            });
        }, 16);

        return () => clearInterval(loop);
    }, [started, gameOver, riverSpeed]);

    /* =====================
       SPAWNER INTELIGENTE E PROGRESSIVO
    ===================== */
    useEffect(() => {
        if (!started || gameOver) return;

        let timeoutId: NodeJS.Timeout;

        const spawnItem = () => {
            if (!startedRef.current || gameOverRef.current) return;

            const currentScore = scoreRef.current;

            // 🚀 DIFICULDADE PROGRESSIVA (Aumenta a velocidade e frequência até um limite de 3.5x)
            const difficultyMultiplier = Math.min(3.5, 1 + (currentScore / 1500));
            const currentSpawnRate = SPAWN_RATE_BASE / (config.current.speedMult * riverSpeed * difficultyMultiplier);
            const baseSpeed = ITEM_SPEED_BASE * config.current.speedMult * difficultyMultiplier;

            // 😈 PROPORÇÃO PROGRESSIVA DE INIMIGOS (Começa em 40% chance de negativo, vai até 85%)
            const negativeChance = Math.min(0.85, 0.4 + (currentScore / 3000));

            const startX = Math.random() * (SCREEN_WIDTH - ITEM_SIZE);
            const startY = -ITEM_SIZE;
            const rand = Math.random();

            let cat: ItemCategory = 'POSITIVE';
            let sub: ItemSubType = 'ORVALHO';

            if (rand < negativeChance) {
                cat = 'NEGATIVE';
                const subRand = Math.random();
                if (subRand > 0.7) sub = 'ESPINHO';
                else if (subRand > 0.4) sub = 'TEMPESTADE';
                else sub = 'LAMA';
            } else {
                const subRand = Math.random();
                if (subRand < 0.15) sub = 'FRUTA';
                else if (subRand < 0.3) sub = 'ESTRELA';
                else sub = 'ORVALHO';
            }

            setItems(prev => [...prev, {
                id: Date.now() + Math.random(),
                x: startX,
                y: startY,
                vy: baseSpeed,
                category: cat,
                subType: sub,
                active: true
            }]);

            // Chama o próximo spawn baseado no tempo dinâmico calculado agora!
            timeoutId = setTimeout(spawnItem, currentSpawnRate);
        };

        // Inicia o ciclo
        timeoutId = setTimeout(spawnItem, SPAWN_RATE_BASE);

        return () => clearTimeout(timeoutId);
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
        setLives(MAX_LIVES); // Reseta os corações
        refreshObjectives();

        setStats({
            total_boxes: 0,
            bonus_boxes: 0,
            magnetic_boxes: 0,
            ghost_boxes: 0,
            score: 0,
            used_magnet: false,
            during_fever: false,
            run_duration: 0,
        });


        setIsTurbulence(false);
        setRiverSpeed(1.0);
        sliviX.current = SCREEN_WIDTH / 2 - SLIVI_SIZE / 2;
        startTime.current = Date.now();
    }

    const refreshObjectives = async () => {
        try {
            const data = await getObjectives('maestro');
            setObjectives(data);
        } catch (error) {
            console.error(error);
        }
    };


    // const router = useRouter();

    async function endGame() {
        setGameOver(true);
        setStarted(false);
        Vibration.cancel();

        const duration = startTime.current
            ? Math.floor((Date.now() - startTime.current) / 1000)
            : 0;

        try {
            const response = await sendGameScore({
                game: 'maestro',
                score,
                duration,
                finalEmotionValue: internalEmotionValue,
                finalEmotionState: currentEmotion,
                stats: {
                    matches_played: 1,
                    total_navigation_time: duration,
                    score: score,
                    ...stats,
                    run_duration: duration,
                },
            });

            // 🎉 COMEMORAÇÃO!
            if (response?.unlocked_seals && response.unlocked_seals.length > 0) {
                router.push({ pathname: './SealUnlocked', params: { seals: JSON.stringify(response.unlocked_seals) }});
                
            }
        } catch (e) {
            console.error(e);
        }
    }

    useEffect(() => {
        refreshObjectives();
    }, []);

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

    function getObjectiveTitle(type: string, target: number, description: string): string {
        const titles: Record<string, string> = {
            'score': `Faça ${target} pontos`,
            'total_boxes': `Colete ${target} itens positivos`, // No Maestro são os orvalhos/frutas/estrelas
            'bonus_boxes': `Colete ${target} itens especiais`, // Frutas ou estrelas
            'ghost_boxes': `Esbarre em ${target} lamas`,
            'run_duration': `Sobreviva por ${target} segundos`
        };
        return titles[description] || `Objetivo: ${description}`;
    }

    function isObjectiveComplete(obj: GameObjective): boolean {
        // 1. Verifica Condições (Ex: não pode ter pego turbulência)
        if (obj.conditions) {
            try {
                const conds: ObjectiveCondition = JSON.parse(obj.conditions);
                if (conds.during_fever === false && stats.during_fever === true) return false;
            } catch (e) {
                console.error("Erro ao fazer parse das condições do objetivo", e);
            }
        }

        // 2. Mapeia o progresso numérico (lendo do state 'stats' e 'score')
        let sessionValue = 0;

        switch (obj.type) {
            case 'score': sessionValue = score; break;
            case 'total_boxes': sessionValue = stats.total_boxes; break;
            case 'bonus_boxes': sessionValue = stats.bonus_boxes; break;
            case 'ghost_boxes': sessionValue = stats.ghost_boxes; break;
            case 'run_duration':
                sessionValue = startTime.current ? Math.floor((Date.now() - startTime.current) / 1000) : 0;
                break;
            default: sessionValue = 0;
        }

        return (obj.current_value + sessionValue) >= obj.target_value;
    }

    return (
        <View style={[styles.container, isTurbulence && styles.turbulenceBg]}>
            <River isRunning={started && !gameOver} isTurbulence={isTurbulence} />            {isTurbulence && <View style={styles.turbulenceWarning} />}

            <View style={styles.hudTop}>
                <View>
                    <Text style={styles.hudText}>Emoção Atual: {currentEmotion}(x{combo.toFixed(1)})</Text>
                    <View style={{ flexDirection: 'row', marginTop: 4 }}>
                        {Array.from({ length: MAX_LIVES }).map((_, i) => (
                            <Text key={i} style={{ opacity: i < lives ? 1 : 0.2, marginHorizontal: 2 }}>
                                ❤️
                            </Text>
                        ))}
                    </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.scoreText}>{score}</Text>
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
                </View>
            </View>

            <View
                {...panResponder.panHandlers}
                style={[styles.sliviArea, { left: sliviX.current, top: SLIVI_Y }]}
            >
                {/* O anel agora serve como alerta de energia vital também */}
                <View style={[styles.energyRing, { borderColor: energy < 30 ? 'red' : '#4dff88', opacity: energy / 100 }]} />
                <Slivi
                    emotion={currentEmotion}
                    size={SLIVI_SIZE}
                    clothingItems={[require('@/assets/images/clothes/pants/black_hoodie_simplev2.png')]} />
            </View>

            {items.map(item => (
                <View
                    key={item.id}
                    pointerEvents="none"
                    style={[styles.item, {
                        left: item.x,
                        top: item.y,
                        backgroundColor: getItemColor(item.subType),
                        borderColor: item.category === 'POSITIVE' ? '#fff' : '#000'
                    }]}
                >
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
                    <Text style={styles.title}>Corrida do Orvalho</Text>
                    <Text style={styles.subTitle}>Slivi está {initialEmotion}</Text>
                    <Text style={styles.desc}>Pegue 💧 para energia e desvie de 💩{'\n'}Cuidado: A energia cai com o tempo e os itens negativos tiram vidas!</Text>
                    <TouchableOpacity onPress={startGame} style={styles.btn}>
                        <Text style={styles.btnText}>COMEÇAR</Text>
                    </TouchableOpacity>
                </View>
            )}

            {gameOver && (
                <View style={styles.overlay}>
                    <Text style={styles.title}>Fim de Jogo</Text>
                    <Text style={styles.scoreBig}>{score}</Text>
                    <Text style={styles.desc}>
                        {lives <= 0 ? "Slivi perdeu todos os corações!" : (energy <= 0 ? "Slivi ficou sem energia!" : `Slivi terminou ${currentEmotion}`)}
                    </Text>
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
    turbulenceBg: { backgroundColor: '#0a1a2a' },
    turbulenceWarning: { ...StyleSheet.absoluteFillObject, borderWidth: 5, borderColor: 'rgba(255, 255, 255, 0.2)' },
    hudTop: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 50, paddingHorizontal: 20, zIndex: 20 },
    hudText: { color: '#fff', fontSize: 14, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },

    scoreText: { color: '#fff', fontSize: 24, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
    comboText: { color: '#ffd700', fontSize: 24, fontWeight: 'bold' },
    scoreBig: { color: '#ffd700', fontSize: 60, fontWeight: 'bold', marginVertical: 20 },

    sliviArea: {
        position: 'absolute',
        width: SLIVI_SIZE,
        height: SLIVI_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5
    },
    energyRing: {
        position: 'absolute',
        width: SLIVI_SIZE + 20,
        height: SLIVI_SIZE + 20,
        borderRadius: (SLIVI_SIZE + 20) / 2,
        borderWidth: 4,
        borderStyle: 'dashed'
    },
    item: {
        position: 'absolute',
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        borderRadius: ITEM_SIZE / 2,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2
    },

    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 20 },
    title: { color: '#4dff88', fontSize: 30, fontWeight: 'bold', marginBottom: 10 },
    subTitle: { color: '#fff', fontSize: 20, marginBottom: 20, opacity: 0.8 },
    desc: { color: '#ccc', fontSize: 16, textAlign: 'center', marginBottom: 40, lineHeight: 24 },
    btn: { backgroundColor: '#4dff88', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30 },
    btnText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
    exitBtn: { position: 'absolute', bottom: 40, alignSelf: 'center', zIndex: 10 }
});
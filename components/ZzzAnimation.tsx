import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

interface ZzzParticle {
  id: number;
  startX: number;
  animY: Animated.Value;
  animOpacity: Animated.Value;
  animScale: Animated.Value;
}

export default function ZzzAnimation({ isSleeping }: { isSleeping: boolean }) {
  const [particles, setParticles] = useState<ZzzParticle[]>([]);
  const particleIdCounter = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Opacidade global para o fade-out lento ao acordar
  const containerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSleeping) {
      // Aparece o container instantaneamente e começa a gerar os Zzz
      containerOpacity.setValue(1);
      
      intervalRef.current = setInterval(() => {
        spawnZzz();
      }, 800); // Um novo Zzz a cada 800ms
    } else {
      // Para de gerar novos Zzz
      if (intervalRef.current) clearInterval(intervalRef.current);
      
      // Faz tudo desaparecer BEM devagar (2 segundos)
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 2000, 
        useNativeDriver: true,
      }).start(() => {
        // Limpa as partículas da memória quando terminar de sumir
        setParticles([]);
      });
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSleeping]);

  const spawnZzz = () => {
    const id = particleIdCounter.current++;
    // Posição X aleatória entre -80 e 80 (esquerda, centro ou direita)
    const startX = Math.floor(Math.random() * 160) - 80;
    
    const animY = new Animated.Value(0);
    const animOpacity = new Animated.Value(0);
    const animScale = new Animated.Value(0.5);

    setParticles(prev => [...prev, { id, startX, animY, animOpacity, animScale }]);

    // Animação individual de cada Zzz
    Animated.parallel([
      Animated.timing(animY, {
        toValue: -150, // Sobe 150 pixels
        duration: 3000,
        useNativeDriver: true,
      }),
      Animated.timing(animScale, {
        toValue: 1.5, // Aumenta de tamanho enquanto sobe
        duration: 3000,
        useNativeDriver: true,
      }),
      Animated.sequence([
        // Fade in rápido, espera um pouco, fade out natural
        Animated.timing(animOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.delay(1200),
        Animated.timing(animOpacity, { toValue: 0, duration: 1000, useNativeDriver: true })
      ])
    ]).start(() => {
      // Remove a partícula do array após ela terminar seu ciclo natural
      setParticles(current => current.filter(p => p.id !== id));
    });
  };

  // Se não tem partículas e o container tá invisível, não renderiza nada
  if (particles.length === 0) return null;

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]} pointerEvents="none">
      {particles.map(p => (
        <Animated.Text
          key={p.id}
          style={[
            styles.zzzText,
            {
              transform: [
                { translateX: p.startX },
                { translateY: p.animY },
                { scale: p.animScale }
              ],
              opacity: p.animOpacity,
            }
          ]}
        >
          Zzz
        </Animated.Text>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15, // Ficar acima do Slivi
    top: -100, // Ajuste para sair da cabeça dele
  },
  zzzText: {
    position: 'absolute',
    fontSize: 40,
    fontWeight: '900',
    color: '#fff',
    // Simulando o stroke/outline grosso característico
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 1,
  }
});
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Função para definir as cores do fundo baseado no resultado
const getResultColors = (isWinner: boolean) => {
  if (isWinner) {
    return ["#FFD700", "#FF8C00", "#FF4500"]; // Dourado/Laranja vibrante para Vitória
  }
  return ["#4A4A4A", "#2b2b2b", "#1a1a1a"]; // Tons escuros para Derrota
};

export default function GameOverScreen() {
  const { roomId, token, userId, score, opponentScore } = useLocalSearchParams();

  // Converte as strings da URL de volta para números
  const numScore = Number(score) || 0;
  const numOpponentScore = Number(opponentScore) || 0;

  const isWinner = numScore > numOpponentScore;

  useEffect(() => {
    fetch('https://api.wfsoft.com.br/slivi-game/api/slivi/game/quiz/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        roomId,
        winnerId: isWinner ? userId : 'outro_id',
        score: numScore,
        durationSeconds: 300
      })
    });
  }, []);

  return (
    <LinearGradient
      colors={getResultColors(isWinner)}
      style={styles.container}
    >
      <View style={styles.iconArea}>
        <View style={styles.circle} />
        {isWinner ?
          <Image source={require('@/assets/images/slivi-feliz.png')} style={{ width: 250, height: 250 }} resizeMode='contain' />
          :
          <Image source={require('@/assets/images/slivi-triste-v2.png')} style={{ width: 250, height: 250 }} resizeMode='contain' />
        }
      </View>

      <View style={styles.textArea}>
        <Text style={styles.title}>{isWinner ? 'VITÓRIA!' : 'DERROTA'}</Text>
        <Text style={styles.subtitle}>
          {isWinner ? 'Você mandou muito bem!' : 'Não foi dessa vez...'}
        </Text>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>Seus pontos: {numScore}</Text>
          <Text style={styles.opponentText}>Oponente: {numOpponentScore}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={() => router.replace('/')}
      >
        <Text style={styles.buttonText}>Voltar ao Início</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 30,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  iconArea: {
    width: '100%',
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  circle: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 10,
    borderColor: "rgba(255,255,255,0.15)",
    zIndex: 1,
  },
  emojiIcon: {
    fontSize: 120,
    zIndex: 10,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 10 },
    textShadowRadius: 15,
  },
  textArea: {
    alignItems: 'center',
    zIndex: 10,
    marginBottom: 40,
  },
  title: {
    fontSize: 46,
    fontWeight: "900",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 6,
    textTransform: 'uppercase',
    letterSpacing: -1.0,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    opacity: 0.9,
    marginTop: 5,
    marginBottom: 20,
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 20,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 5,
  },
  opponentText: {
    fontSize: 18,
    color: "#fff",
    opacity: 0.8,
  },
  button: {
    alignSelf: 'center',
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 10,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  }
});
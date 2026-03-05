import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Button, Text, View } from 'react-native';

export default function GameOverScreen() {
  const { roomId, userId, score, opponentScore } = useLocalSearchParams();
  
  // Converte as strings da URL de volta para números
  const numScore = Number(score) || 0;
  const numOpponentScore = Number(opponentScore) || 0;
  
  const isWinner = numScore > numOpponentScore;

  useEffect(() => {
    fetch('https://api.wfsoft.com.br/slivi-game/api/slivi/game/quiz/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer SEU_TOKEN' },
      body: JSON.stringify({
        roomId,
        winnerId: isWinner ? userId : 'outro_id',
        score: numScore,
        durationSeconds: 300 
      })
    });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 32 }}>{isWinner ? '🏆 VOCÊ VENCEU!' : '💀 VOCÊ PERDEU!'}</Text>
      <Text style={{ fontSize: 20 }}>Seus pontos: {numScore}</Text>
      {/* Manda de volta para o menu principal */}
      <Button title="Voltar ao Início" onPress={() => router.replace('/')} />
    </View>
  );
}
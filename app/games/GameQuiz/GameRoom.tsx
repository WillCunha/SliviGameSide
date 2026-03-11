import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Card from './Card';
import QuizModal from './QuizModal';
import { useGameRoom } from './useGameRoom';

export default function GameScreen() {
  const { roomId, userId, questions: questionsParam } = useLocalSearchParams();

  const questions = typeof questionsParam === 'string' ? JSON.parse(questionsParam) : [];

  const roomIdStr = String(roomId);
  const userIdStr = String(userId);

  const { roomData, playCard, resolveAnswer, drawCard } = useGameRoom(roomIdStr, userIdStr);

  const opponentId = roomData
    ? Object.keys(roomData.players).find(id => String(id) !== userIdStr)
    : null;

  const isMyTurn = String(roomData?.current_turn) === userIdStr;

  const activeQuestionId = roomData?.table?.active_question;
  const waitingAnswerFrom = roomData?.table?.waiting_answer_from;

  const myHandIds = roomData?.players[userIdStr]?.hand || [];

  const myHand = questions.filter((q: any) =>
    myHandIds.map(Number).includes(Number(q.id))
  );

  const fullActiveQuestion = activeQuestionId
    ? questions.find((q: any) => Number(q.id) === Number(activeQuestionId))
    : null;

  // --- NOVIDADE: Extraindo os nomes e pontos para o placar ---
  const myScore = roomData?.players[userIdStr]?.score || 0;
  const myName = roomData?.players[userIdStr]?.name || "Você";

  const opponentScore = opponentId ? (roomData?.players[opponentId]?.score || 0) : 0;
  const opponentName = opponentId ? (roomData?.players[opponentId]?.name || "Oponente") : "Oponente";
  // -----------------------------------------------------------

  useEffect(() => {
    if (roomData?.status === 'finished') {
      router.replace({
        pathname: './GameOverScreen',
        params: {
          roomId: roomIdStr,
          userId: userIdStr,
          score: myScore,
          opponentScore: opponentScore
        }
      });
    }
  }, [roomData?.status, opponentId, roomIdStr, userIdStr, myScore, opponentScore]);

  if (!roomData) return null;

  return (
    <View style={styles.container}>

      {/* MÃO DO OPONENTE */}
      <View style={styles.opponentArea}>
        {/* PLACAR DO OPONENTE */}
        <View style={styles.scoreBoard}>
          <Text style={styles.scoreText}>{opponentName}: </Text> <Text style={styles.scoreText}> {opponentScore} pts</Text>
        </View>

        <View style={styles.handRow}>
          {Array.from({ length: opponentId ? (roomData.players[opponentId]?.hand_count || 0) : 0 }).map((_, i) => (
            <View key={i} style={{ marginLeft: i === 0 ? 0 : -30 }}>
              <Card isBack />
            </View>
          ))}
        </View>
      </View>

      {/* CENTRO DA MESA */}
      <View style={styles.tableCenter}>
        <TouchableOpacity
          style={styles.deckContainer}
          onPress={drawCard}
          disabled={!isMyTurn || !!activeQuestionId}
        >
          <View style={[styles.deckCard, { top: -4, left: -4, backgroundColor: '#555' }]} />
          <View style={[styles.deckCard, { top: -2, left: -2, backgroundColor: '#777' }]} />
          <View style={styles.deckCard}>
            <Card isBack />
            <Text style={styles.deckCount}>{roomData.deck?.length || 0}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.statusContainer}>
          {activeQuestionId ? (
            <Text style={styles.statusText}>
              {String(waitingAnswerFrom) === userIdStr ? "Sua vez de responder!" : "Aguardando oponente..."}
            </Text>
          ) : (
            <Text style={styles.statusText}>{isMyTurn ? "Sua vez de jogar!" : "Aguarde..."}</Text>
          )}
        </View>
      </View>

      {/* MINHA MÃO */}
      <View style={styles.myArea}>
        {/* MEU PLACAR */}
        <View style={styles.scoreBoard}>
          <Text style={styles.scoreText}>{myName}: </Text> <Text style={styles.scoreText}>{myScore} pts</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {myHand.map((q: any) => (
            <Card
              key={q.id}
              pergunta={q}
              disabled={!isMyTurn || !!activeQuestionId}
              onPress={() => playCard(q)}
            />
          ))}
        </ScrollView>
      </View>

      {/* MODAL DE RESPOSTA */}
      {fullActiveQuestion && String(waitingAnswerFrom) === userIdStr && (
        <QuizModal
          pergunta={fullActiveQuestion}
          onAnswer={(correct) => resolveAnswer(correct, fullActiveQuestion.pontos)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E', padding: 20, overflow: 'hidden' },
  opponentArea: { height: '25%', justifyContent: 'center', alignItems: 'center', maxWidth: '100%' },
  handRow: { flexDirection: 'row', maxWidth: '100%' },
  tableCenter: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  deckContainer: { width: 80, height: 120, marginRight: 30, position: 'relative' },
  deckCard: { position: 'absolute', width: '100%', height: '100%', backgroundColor: '#E94560', borderRadius: 8, borderWidth: 2, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  deckText: { color: '#FFF', fontWeight: 'bold', fontSize: 18, transform: [{ rotate: '-45deg' }] },
  deckCount: { color: '#FFF', position: 'absolute', bottom: 5, right: 5, fontSize: 12, fontWeight: 'bold' },
  statusContainer: { flex: 1, alignItems: 'center' },
  statusText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  myArea: { height: '35%', paddingVertical: 10, justifyContent: 'center', alignItems: 'center', },

  // Novos estilos para o placar
  scoreBoard: { marginBottom: 10, alignItems: 'center', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 10, width: '100%' },
  scoreText: { color: '#F1C40F', fontSize: 16, fontWeight: 'bold' },
});
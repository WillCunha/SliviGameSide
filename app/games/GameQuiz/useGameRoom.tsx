import { database } from '@/src/api/firebase';
import { increment, onValue, ref, update } from 'firebase/database';
import { useEffect, useState } from 'react';

export const useGameRoom = (roomId: string, userId: string) => {
  const [roomData, setRoomData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Força o userId para string para uso interno no hook
  const safeUserId = String(userId);

  useEffect(() => {
    if (!roomId) return;
    const roomRef = ref(database, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      setRoomData(snapshot.val());
      setLoading(false);
    });
    return () => unsubscribe();
  }, [roomId]);

  // JOGAR A CARTA E VERIFICAR FIM DE JOGO
  const playCard = async (question: any) => {
    if (!roomData) return;
    
    // Garantindo que pegamos o oponente comparando como String
    const opponentId = Object.keys(roomData.players).find(id => String(id) !== safeUserId);
    if (!opponentId) return; // Proteção extra
    
    const updates: any = {};
    updates[`rooms/${roomId}/table/active_question`] = Number(question.id); // Salva como número padronizado
    updates[`rooms/${roomId}/table/waiting_answer_from`] = opponentId;
    
    const currentHand = roomData.players[safeUserId].hand || [];
    
    // CORREÇÃO CRÍTICA: Converte ambos para Number antes de comparar
    updates[`rooms/${roomId}/players/${safeUserId}/hand`] = currentHand.filter(
      (id: any) => Number(id) !== Number(question.id)
    );
    updates[`rooms/${roomId}/players/${safeUserId}/hand_count`] = increment(-1);
    
    updates[`rooms/${roomId}/current_turn`] = opponentId;
    updates[`rooms/${roomId}/last_action`] = "card_played";

    // REGRA DE FIM DE JOGO: Se a mão vai ficar vazia, acaba o jogo!
    const myHandCount = roomData.players[safeUserId]?.hand_count || 0;
    if (myHandCount - 1 <= 0) { // Usar <= 0 é mais seguro que === 0
      updates[`rooms/${roomId}/status`] = 'finished';
    }

    await update(ref(database), updates);
  };

  // COMPRAR CARTA DO MONTE
  const drawCard = async () => {
    if (!roomData) return;
    
    const myHandCount = roomData.players[safeUserId]?.hand_count || 0;
    const deck = roomData.deck || [];

    // Regra: só compra se tiver 3 ou menos, e se tiver carta no deck
    if (myHandCount > 3) {
      alert("Você só pode comprar se tiver 3 cartas ou menos!");
      return;
    }
    if (deck.length === 0) {
      alert("O baralho acabou!");
      return;
    }

    const drawnCardId = deck[0]; // Pega a primeira do monte
    const newDeck = deck.slice(1); // Remove a carta do monte
    const currentHand = roomData.players[safeUserId].hand || [];

    const updates: any = {};
    updates[`rooms/${roomId}/deck`] = newDeck;
    updates[`rooms/${roomId}/players/${safeUserId}/hand`] = [...currentHand, drawnCardId];
    updates[`rooms/${roomId}/players/${safeUserId}/hand_count`] = increment(1);
    updates[`rooms/${roomId}/last_action`] = "card_drawn";

    await update(ref(database), updates);
  };

  // RESOLVER A RESPOSTA
  const resolveAnswer = async (isCorrect: boolean, points: number) => {
    if (!roomData) return;
    
    // Garantindo que pegamos o oponente comparando como String
    const opponentId = Object.keys(roomData.players).find(id => String(id) !== safeUserId);
    if (!opponentId) return;

    const winnerId = isCorrect ? safeUserId : opponentId;

    const updates: any = {};
    updates[`rooms/${roomId}/players/${winnerId}/score`] = increment(Number(points)); // Força número nos pontos também
    updates[`rooms/${roomId}/table`] = null; 
    updates[`rooms/${roomId}/last_action`] = "question_answered";
    updates[`rooms/${roomId}/current_turn`] = safeUserId; 

    await update(ref(database), updates);
  };

  return { roomData, loading, playCard, resolveAnswer, drawCard };
};
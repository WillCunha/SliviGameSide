import { database } from '@/src/api/firebase';
import { router, useLocalSearchParams } from 'expo-router';
import { onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

export default function WaitingRoomScreen() {
  // Pega os parâmetros da URL
  const { roomId, userId, questions } = useLocalSearchParams();
  const [roomData, setRoomData] = useState<any>(null);

  useEffect(() => {
    if (!roomId) return;

    const roomRef = ref(database, `rooms/${roomId}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      setRoomData(data);

      if (data && data.status === 'playing') {
        // Substitui a tela de espera pela tela do jogo
        router.replace({
          pathname: './GameRoom',
          params: { roomId, userId, questions } // questions já veio como string, só repassar
        });
      }
    });

    return () => unsubscribe();
  }, [roomId, userId, questions]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Código da Sala: {roomId}</Text>
      <ActivityIndicator size="large" color="#0000ff" />
      <Text style={styles.waitingText}>
        Aguardando oponente... ({roomData?.players ? Object.keys(roomData.players).length : 1}/2)
      </Text>
      <View style={{position: 'absolute', bottom: 5, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%'}}>
        <Image source={require('@/assets/images/icon_slivi.png')} style={{width: 100, height: 100}} resizeMode='contain'/>
        <Image source={require('@/assets/images/wfLogo.png')} style={{width: 65, height: 65, marginRight: '5%'}} resizeMode='contain'/>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  waitingText: { fontSize: 18, marginTop: 20 },
});
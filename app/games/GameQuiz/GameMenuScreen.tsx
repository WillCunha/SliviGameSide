import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function GameMenuScreen() {
  const [loading, setLoading] = useState(false);
  const [roomCode, setRoomCode] = useState('');

  // 1. Criar Sala Privada
  const handleCreatePrivate = async () => {
    const userId = await AsyncStorage.getItem("userId");
    const token = await AsyncStorage.getItem("slivi_token");

    setLoading(true);
    const res = await fetch('https://api.wfsoft.com.br/slivi-game/api/slivi/game/quiz/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ isPublic: false })
    });
    const data = await res.json();
    console.log(data);
    setLoading(false);

    router.push({
      pathname: './WaitingRoomScreen',
      params: {
        roomId: data.data.roomId,
        userId,
        questions: JSON.stringify(data.data.questions)
      }
    });
  };

  // 2. Entrar em Sala Privada
  const handleJoinPrivate = async () => {
    const userId = await AsyncStorage.getItem("userId");
    const token = await AsyncStorage.getItem("slivi_token");
    setLoading(true);
    const res = await fetch('https://api.wfsoft.com.br/slivi-game/api/slivi/game/quiz/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }, body: JSON.stringify({ roomId: roomCode })
    });
    const data = await res.json();
    setLoading(false);

    if (data.status === 'success') {
      router.push({
        pathname: './GameRoom', // Assumindo que o nome do arquivo seja GameRoom.tsx
        params: {
          roomId: data.data.roomId,
          userId,
          questions: JSON.stringify(data.data.questions)
        }
      });
    } else {
      Alert.alert("Erro", "Sala não encontrada ou já cheia.");
    }
  };

  // 3. Procurar Partida (Matchmaking)
  const handleMatchmake = async () => {
    const userId = await AsyncStorage.getItem("userId");
    const token = await AsyncStorage.getItem("slivi_token");
    setLoading(true);
    const res = await fetch('https://api.wfsoft.com.br/slivi-game/api/slivi/game/quiz/matchmake', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    const data = await res.json();
    setLoading(false);

    if (data.data.status === 'playing') {
      router.push({
        pathname: './GameRoom',
        params: {
          roomId: data.data.roomId,
          userId,
          questions: JSON.stringify(data.data.questions)
        }
      });
    } else {
      router.push({
        pathname: './WaitingRoomScreen',
        params: {
          roomId: data.data.roomId,
          userId,
          questions: JSON.stringify(data.data.questions)
        }
      });
    }
  };

  if (loading) return <ActivityIndicator size="large" />;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <TouchableOpacity onPress={handleMatchmake} style={styles.btn}>
        <View style={styles.icon}>
          <Ionicons name="search" size={26} color="#000" />
        </View>
        <View style={styles.text}>
          <Text style={styles.txt}>Procurar Partidas</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleCreatePrivate} style={styles.btn}>
        <View style={styles.icon}>
          <Ionicons name="create" size={26} color="#000" />
        </View>
        <View style={styles.text}>
          <Text style={styles.txt}>Criar uma sala</Text>
        </View>
      </TouchableOpacity>
      <TextInput placeholder="Digite o código da sala..." onChangeText={setRoomCode} style={styles.input} />
      <TouchableOpacity onPress={handleJoinPrivate} style={styles.btn}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name="login" size={26} color="#000" />
        </View>
        <View style={styles.text}>
          <Text style={styles.txt}>Localizar uma sala</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(204, 156, 0, 0.84)',
  },

  btn: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderColor: '#000',
    borderWidth: 2,
    padding: 15,
    color: '#000',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: '5%',
    fontWeight: '800',
  },

  icon: {
    width: '33%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  text: {
    width: '77%',
  },

  txt: {
    fontWeight: '800',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'left',
   },

  input: {
    marginTop: '5%',
    marginBottom: '-2%',
    borderWidth: 2,
    padding: 10,
    backgroundColor: '#fff',
    color: '#000',
    borderRadius: 20,
    textAlign: 'center',
  }


})
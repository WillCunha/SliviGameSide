import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { login } from '../src/services/authService'; // Ajuste o caminho

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);

  // Verifica se já tem token salvo assim que abre o app
  useEffect(() => {
    async function checkToken() {
      const storedToken = await AsyncStorage.getItem('slivi_token');
      const storedUserId = await AsyncStorage.getItem('slivi_userId');

      if (storedToken && storedUserId) {
        // Pula pro Loading!
        router.replace({
          pathname: '/loading',
          params: { token: storedToken, userId: storedUserId },
        });
      } else {
        setLoading(false);
      }
    }
    checkToken();
  }, []);

  async function handleLogin() {
    try {
      setLoading(true);

      // O nosso novo authService já salva no AsyncStorage e devolve o userId
      const { token, userId } = await login(email, password);

      router.replace({
        pathname: '/loading',
        params: { token, userId },
      });

    } catch (err: any) {
      Alert.alert('Erro', err.message);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={styles.topArea}>

      </View>
      <View style={styles.loginArea}>
        <Text style={styles.txtLoginArea}>Faça seu login:</Text>
        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          style={styles.inputLogins}
        />
        <TextInput
          placeholder="Senha"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.inputLogins}
        />
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={styles.inputBtn}

        >
          <Text style={styles.inputBtnTxt}
          >{loading ? 'Entrando...' : 'Entrar'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({

  root: {
    flex: 1,
    height: '100%',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topArea: {
    height: '100%',
    width: '100%',
    backgroundColor: '#1c3e6a'
  },
  loginArea: {
    flex: 3,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#fff',
    marginTop: '-125%',
    padding: '5%',
    width: '100%',
    height: '50%',
  },
  txtLoginArea: {
    color: '#000',
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 26,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  inputLogins: {
    marginBottom: 12,
    borderBottomColor: '#1c3e6a',
    borderBottomWidth: 1,
    marginTop: '5%',
    color: '#707070',
    fontWeight: '700',
    fontSize: 14
  },
  inputBtn: {
    marginBottom: 12,
    backgroundColor: '#1c3e6a',
    borderBottomWidth: 1,
    borderRadius: 20,
    marginTop: '5%',
    padding: 10,
  },
  inputBtnTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1
  }

})
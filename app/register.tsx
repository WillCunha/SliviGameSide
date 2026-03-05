import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ImageBackground, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { checkAvailability, register } from '../src/services/authService'; // <-- Importe a nova função aqui

export default function RegisterScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [sliviName, setSliviName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);

  // Novos estados para avisos visuais
  const [emailError, setEmailError] = useState('');
  const [usernameError, setUsernameError] = useState('');

  // ... (mantenha o seu useEffect do checkToken aqui) ...
  useEffect(() => {
    async function checkToken() {
      const storedToken = await AsyncStorage.getItem('slivi_token');
      const storedUserId = await AsyncStorage.getItem('slivi_userId');

      if (storedToken && storedUserId) {
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

  // --- FUNÇÕES DE VERIFICAÇÃO ---
  async function handleCheckEmail() {
    if (!email) return;
    try {
      const exists = await checkAvailability('email', email);
      if (exists) {
        setEmailError('Este e-mail já está em uso.');
      } else {
        setEmailError(''); // Limpa o erro se estiver tudo ok
      }
    } catch (err) {
      console.log('Erro ao verificar e-mail', err);
    }
  }

  async function handleCheckUsername() {
    if (!username) return;
    try {
      // Opcional: remover o '@' caso o usuário tenha digitado para validar certinho
      const cleanUsername = username.replace('@', '');
      const exists = await checkAvailability('username', cleanUsername);
      if (exists) {
        setUsernameError('Este "@" já está em uso.');
      } else {
        setUsernameError('');
      }
    } catch (err) {
      console.log('Erro ao verificar username', err);
    }
  }

  async function handleRegister() {
    // Evita cadastro se houver erros nos campos
    if (emailError || usernameError) {
      Alert.alert('Aviso', 'Por favor, corrija os erros antes de continuar.');
      return;
    }

    if (!email || !username || !sliviName || !password) {
      Alert.alert('Aviso', 'Preencha todos os campos!');
      return;
    }

    try {
      setLoading(true);
      const cleanUsername = username.replace('@', '');
      const { token, userId } = await register(email, password, cleanUsername, sliviName);

      router.replace({
        pathname: '/loading',
        params: { token, userId, isNewUser: 'true' },
      });

    } catch (err: any) {
      Alert.alert('Erro no Cadastro', err.message);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#CD56FD" />
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('@/assets/images/imgBgLogin.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.root}>
        <StatusBar style="dark" />

        <View style={styles.topArea}>
          <Image
            source={require('@/assets/images/header_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.loginArea}>
          <View style={styles.headerLoginArea}>
            <Text style={styles.txtLoginArea}>Criar Conta</Text>
            <Image
              source={require('@/assets/images/logo300v1.png')}
              style={styles.logoWf}
              resizeMode='center'
            />
          </View>

          <TextInput
            placeholder="Email"
            placeholderTextColor="#999"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError(''); // Limpa o erro enquanto o usuário edita
            }}
            onBlur={handleCheckEmail} // Dispara a checagem ao sair do campo
            style={[styles.inputLogins, emailError ? { borderBottomColor: 'red' } : null]}
          />
          {/* Exibe o texto de erro logo abaixo do input */}
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

          <TextInput
            placeholder="Nome de Usuário (@)"
            placeholderTextColor="#999"
            autoCapitalize="none"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              setUsernameError('');
            }}
            onBlur={handleCheckUsername}
            style={[styles.inputLogins, usernameError ? { borderBottomColor: 'red' } : null]}
          />
          {usernameError ? <Text style={styles.errorText}>{usernameError}</Text> : null}

          <TextInput
            placeholder="Nome do seu Slivi"
            placeholderTextColor="#999"
            value={sliviName}
            onChangeText={setSliviName}
            style={styles.inputLogins}
          />
          <TextInput
            placeholder="Senha"
            placeholderTextColor="#999"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.inputLogins}
          />

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
            style={{ marginTop: '7%', marginBottom: '7%' }}
          >
            <LinearGradient
              colors={['#6A0DAD', '#CD56FD']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBtn}
            >
              <Text style={styles.gradientBtnTxt}>
                {loading ? 'Criando...' : 'Continuar'}
              </Text>

              {!loading && (
                <Feather
                  name="arrow-right"
                  size={22}
                  color="#fff"
                  style={{ marginLeft: 8 }}
                />
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('./login')} activeOpacity={0.7}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800', textAlign: 'center' }}>
              Já tem uma conta WF? <Text style={{ color: '#CD56FD', fontSize: 12, fontWeight: '800', textAlign: 'center' }}>Faça o login!</Text>
            </Text>
          </TouchableOpacity>

        </View>
      </View>
    </ImageBackground>
  );
}


const styles = StyleSheet.create({
  background: {
    flex: 1,
  },

  root: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  topArea: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },

  headerLoginArea: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    height: 60,
  },

  logoWf: {
    width: 60,
    height: 60,
  },

  logo: {
    width: 260,
    height: 260,
  },

  loginArea: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(255, 255, 255, 0.77)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#000',
  },


  txtLoginArea: {
    color: '#000',
    textAlign: 'left',
    fontWeight: '900',
    fontSize: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlignVertical: 'center',
    width: '50%',
    height: '100%',
  },

  inputLogins: {
    marginBottom: 16,
    borderBottomColor: '#CD56FD',
    borderBottomWidth: 1,
    paddingVertical: 8,
    color: '#707070',
    fontWeight: '700',
    fontSize: 14,
  },

  inputBtn: {
    backgroundColor: '#CD56FD',
    borderRadius: 20,
    paddingVertical: 12,
    marginTop: 10,
  },

  inputBtnDisabled: {
    opacity: 0.7,
  },

  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 10,
    fontWeight: 'bold',
  },

  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 999, // deixa bem arredondado
    marginTop: 10,

    // sombra (Android)
    elevation: 4,

    // sombra (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  gradientBtnTxt: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  inputBtnTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
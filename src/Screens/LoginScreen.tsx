import { useState } from 'react';
import { Alert, Button, TextInput, View } from 'react-native';
import { login } from '../services/authService';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin() {
    try {
      const { token } = await login(email, password);
      Alert.alert('Sucesso', 'Token recebido!');
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    }
  }

  return (
    <View style={{ padding: 24 }}>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={{ marginBottom: 12 }}
      />

      <TextInput
        placeholder="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ marginBottom: 12 }}
      />

      <Button title="Entrar" onPress={handleLogin} />
    </View>
  );
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { BackHandler } from 'react-native';

export function useBackToLoading() {
  const router = useRouter();

  const handleBack = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('slivi_token');
      const userId = await AsyncStorage.getItem('slivi_userId');

      if (token && userId) {
        // Usamos replace para garantir que o histórico seja resetado
        // e o usuário não consiga "voltar" do loading para a tela de erro
        router.replace({
          pathname: '/loading',
          params: { token, userId },
        });
      } else {
        router.replace('/');
      }
    } catch (error) {
      console.error("Erro na navegação de retorno:", error);
      router.replace('/');
    }
    
    // Retornar TRUE é o que "mata" o comportamento padrão do Android (o gesto de fechar a tela)
    return true; 
  }, [router]);

  useEffect(() => {
    // Isso aqui captura tanto o botão físico quanto o gesto de arrastar do Android
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleBack();
        return true; // Bloqueia o fechamento imediato da tela pelo sistema
      }
    );

    return () => backHandler.remove();
  }, [handleBack]);

  return { handleBack };
}
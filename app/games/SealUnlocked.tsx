import { SEALS_IMAGES } from "@/src/components/clothes/sealsMap";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const { width } = Dimensions.get("window");

// Helper para definir as cores do fundo baseado na raridade (tier)
const getTierColors = (tier: string) => {
  switch (tier?.toLowerCase()) {
    case "epico":
      return ["#FFD700", "#FF8C00", "#FF4500"]; // Dourado/Laranja
    case "secreto":
      return ["#B14AFF", "#7000FF", "#32008A"]; // Roxo/Neon
    case "avancado":
      return ["#4AD6FF", "#008AFF", "#0048D9"]; // Azul
    case "intermediario":
      return ["#4AFF88", "#00B33C", "#006622"]; // Verde
    default: // inicial
      return ["#FFD24A", "#FF8A00", "#D94A00"]; // Padrão
  }
};

export default function SealUnlocked() {
  const router = useRouter();
  // Pega a string JSON dos parâmetros e converte de volta para Array
  const { seals } = useLocalSearchParams<{ seals: string }>();
  const unlockedSeals = seals ? JSON.parse(seals) : [];

  const [currentIndex, setCurrentIndex] = useState(0);

  // Se por acaso a tela abrir sem selos, já mostramos algo genérico ou fechamos
  if (unlockedSeals.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: '#FF8A00', justifyContent: 'center' }]}>
        <Text style={styles.title}>Nenhum selo :(</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentSeal = unlockedSeals[currentIndex];
  const isLastSeal = currentIndex === unlockedSeals.length - 1;

  const sealImage = SEALS_IMAGES[currentSeal.image_url];

  const handleNext = () => {
    if (isLastSeal) {
      // Se acabou, volta pra tela anterior (ou pro menu principal)
      router.push('../loading');
    } else {
      // Passa pro próximo selo que ele ganhou
      setCurrentIndex((prev) => prev + 1);
    }
  };

  return (
    <LinearGradient
      colors={getTierColors(currentSeal.tier)}
      style={styles.container}
    >

      <View style={styles.imgSeal}>
        <View style={styles.circle} />
        <Image
          source={sealImage} // Ajuste o caminho se necessário
          style={styles.sealImage}
          resizeMode="contain"
        />
      </View>

      <View style={styles.textArea}>
        <Text style={styles.title}>PARABÉNS!</Text>
        <Text style={styles.subtitle}>Você ganhou {unlockedSeals.length > 1 ? `${unlockedSeals.length} Selos:` : "01 Selo"}</Text>
        <Text style={styles.sealName}>{currentSeal.name}</Text>
        <Text style={styles.sealDescription}>{currentSeal.description}</Text>
        {currentSeal.reward_xp && (
          <Text style={styles.xpText}>+ {currentSeal.reward_xp} XP</Text>
        )}
      </View>

      <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={handleNext}>
        <Text style={styles.buttonText}>{isLastSeal ? "Continuar" : "Próximo Selo"}</Text>
      </TouchableOpacity>
      <Text style={styles.counter}>
        {unlockedSeals.length > 1 ? `SELO ${currentIndex + 1}/${unlockedSeals.length}` : ""}
      </Text>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 30,
    paddingHorizontal: 30,
  },
  imgSeal: {
    width: '100%',
    height: 400,
    alignItems: 'center',
    justifyContent: 'center'
  },
  circle: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 500,
    borderWidth: 10,
    borderColor: "rgba(255,255,255,0.25)",
    zIndex: 1,
  },
  sealImage: {
    position: "absolute",
    top: 40,
    width: 300,
    height: 300,
    zIndex: 10,
  },
  title: {
    alignSelf: "center",
    fontSize: 46,
    fontWeight: "900",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 5,
    zIndex: 10,
  },
  textArea: {
    alignItems: 'center', // Centralizei para a imagem e os textos ficarem alinhados
    zIndex: 10,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    opacity: 0.9,
    alignSelf: 'center',
  },
  counter: {
    marginTop: '5%',
    alignSelf: 'center',
    fontSize: 14,
    color: '#fff',
  },
  // sealImage: {
  //   width: 150,
  //   height: 150,
  //   marginVertical: 20,
  // },
  sealName: {
    marginTop: '15%',
    fontSize: 34,
    fontWeight: "800",
    color: "#fff",
    textAlign: 'center',
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 2, height: 3 },
    textShadowRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: -1.0,
  },
  sealDescription: {
    fontSize: 18,
    color: "#fff",
    textAlign: 'center',
    opacity: 0.9,
  },
  xpText: {
    marginTop: 15,
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFD700",
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
    overflow: 'hidden',
  },

  button: {
    marginTop: '10%',
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
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { fetchFoods } from "@/src/services/foodService";
import { FOOD_IMAGES } from "./foodMap";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectFood: (food: any) => void;
};

export default function FoodModal({ visible, onClose, onSelectFood }: Props) {
  const [foods, setFoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadFoods();
    }
  }, [visible]);

  async function loadFoods() {
    try {
      setLoading(true);
      const result = await fetchFoods();
      setFoods(result);
    } catch (err) {
      console.error("Erro ao carregar alimentos", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>

          <Text style={styles.title}>Escolha um alimento</Text>

          {loading ? (
            <ActivityIndicator size="large" />
          ) : (
            <FlatList
              data={foods}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              renderItem={({ item }) => {
                const sprites = FOOD_IMAGES[item.image_key];
                const image = sprites?.[0];

                return (
                  <TouchableOpacity
                    style={styles.card}
                    onPress={() => onSelectFood(item)}
                  >
                    <Image source={image} style={styles.image} />
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.effect}>+{item.hunger} fome</Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Fechar</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },

  container: {
    backgroundColor: "#1c1c1c",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%",
  },

  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },

  card: {
    flex: 1,
    margin: 8,
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
  },

  image: {
    width: 90,
    height: 90,
    resizeMode: "contain",
  },

  name: {
    color: "#fff",
    fontWeight: "bold",
    marginTop: 6,
  },

  effect: {
    color: "#aaa",
    fontSize: 12,
  },

  closeBtn: {
    backgroundColor: "#FF9800",
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },

  closeText: {
    fontWeight: "bold",
    color: "#000",
  },
});


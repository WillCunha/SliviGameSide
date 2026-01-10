import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { fetchFoods } from "../services/sliviService";
import FoodCard from "./FoodCard";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectFood: (food: any) => void;
};

export default function FoodModal({ visible, onClose, onSelectFood }: Props) {
  const [foods, setFoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadFoods();
    }
  }, [visible]);

  async function loadFoods() {
    try {
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
              renderItem={({ item }) => (
                <FoodCard food={item} onPress={() => onSelectFood(item)} />
              )}
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

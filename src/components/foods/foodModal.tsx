import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { fetchFoods } from "@/src/services/foodService";
import { FOOD_IMAGES } from "./foodMap";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Dicionário para títulos bonitos na geladeira
const CATEGORY_LABELS: Record<string, string> = {
    VERDURAS: '🥗 Verduras',
    CARNES: '🥩 Carnes',
    FRUTAS: '🍎 Frutas',
    MASSA: '🥖 Massas & Pães',
    OVOS: '🥚 Ovos',
    LATICINIOS: '🥛 Laticínios',
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectFood: (foods: any[]) => void;
};

const DraggableFood = ({ item, onDropOnPlate }: { item: any, onDropOnPlate: (item: any) => void }) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const sprites = FOOD_IMAGES[item.image_key as keyof typeof FOOD_IMAGES];
  const image = sprites?.[0];
  const formattedQuantity = item.quantity < 10 ? `0${item.quantity}` : item.quantity;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.moveX > SCREEN_WIDTH / 2) {
          onDropOnPlate(item);
        }

        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.card,
        { transform: [{ translateX: pan.x }, { translateY: pan.y }] }
      ]}
      {...panResponder.panHandlers}
    >
      {image && <Image source={image} style={styles.image} pointerEvents="none" />}
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.quantity}>Disponível: {formattedQuantity}</Text>

      <Text style={styles.effect}>+{item.hunger} Fome</Text>
      <Text style={styles.effect}>+{item.energy} Energia</Text>
      <Text style={styles.effect}>+{item.happiness} Feliz</Text>
    </Animated.View>
  );
};

export default function FoodModal({ visible, onClose, onSelectFood }: Props) {
  // Agora armazenamos o objeto agrupado
  const [groupedFoods, setGroupedFoods] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [plateItems, setPlateItems] = useState<any[]>([]);

  useEffect(() => {
    if (visible) {
      loadFoods();
      setPlateItems([]);
    }
  }, [visible]);

  async function loadFoods() {
    try {
      setLoading(true);
      const result = await fetchFoods();
      setGroupedFoods(result); // Guarda o resultado agrupado
    } catch (err) {
      console.error("Erro ao carregar alimentos", err);
    } finally {
      setLoading(false);
    }
  }

  const handleDropOnPlate = (droppedItem: any) => {
    setPlateItems((prevPlate) => [...prevPlate, droppedItem]);

    setGroupedFoods((prevFoods) => {
      const type = droppedItem.type;
      if (!prevFoods[type]) return prevFoods;

      return {
        ...prevFoods,
        [type]: prevFoods[type].map((food) =>
          food.id === droppedItem.id ? { ...food, quantity: food.quantity - 1 } : food
        )
      };
    });
  };

  const removeFromPlate = (indexToRemove: number, itemToRemove: any) => {
    setPlateItems((prevPlate) => {
      const newPlate = [...prevPlate];
      newPlate.splice(indexToRemove, 1); 
      return newPlate;
    });

    setGroupedFoods((prevFoods) => {
      const type = itemToRemove.type;
      if (!prevFoods[type]) return prevFoods;

      return {
        ...prevFoods,
        [type]: prevFoods[type].map((food) =>
          food.id === itemToRemove.id ? { ...food, quantity: food.quantity + 1 } : food
        )
      };
    });
  };

  const handleServe = () => {
    if (plateItems.length === 0) {
      Alert.alert("Prato Vazio", "Coloque alguma comida no prato antes de servir!");
      return;
    }
    onSelectFood(plateItems);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>

          <View style={styles.header}>
            <Text style={styles.title}>GELADEIRA</Text>
            <Text style={styles.subTitle}>Arraste até 3 itens para o prato</Text>
          </View>

          <View style={styles.splitArea}>

            {/* LADO ESQUERDO: Geladeira / Inventário */}
            <View style={styles.leftSide}>
              {loading ? (
                <ActivityIndicator size="large" color="#FF9800" />
              ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {Object.entries(groupedFoods).map(([category, items]) => {
                    // Filtra para exibir apenas os que tem na geladeira
                    const availableItems = items.filter((food) => food.quantity > 0);
                    
                    // Se não tiver nenhum item dessa categoria, não renderiza o título
                    if (availableItems.length === 0) return null;

                    return (
                        <View key={category} style={styles.categoryContainer}>
                            <Text style={styles.categoryTitle}>
                                {CATEGORY_LABELS[category] || category}
                            </Text>
                            <View style={styles.fridgeRow}>
                                {availableItems.map((food) => (
                                    <DraggableFood
                                        key={food.id}
                                        item={food}
                                        onDropOnPlate={handleDropOnPlate}
                                    />
                                ))}
                            </View>
                        </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* LADO DIREITO: O Prato */}
            <View style={styles.rightSide}>
              <View style={styles.plateArea}>
                <Text style={styles.plateText}>Prato ({plateItems.length}/3)</Text>

                <View style={styles.plate}>
                  {plateItems.map((item, index) => {
                    const sprites = FOOD_IMAGES[item.image_key as keyof typeof FOOD_IMAGES];
                    const image = sprites?.[0];
                    return (
                      <TouchableOpacity key={`${item.id}-${index}`} onPress={() => removeFromPlate(index, item)}>
                        <Image source={image} style={styles.plateFoodImage} />
                      </TouchableOpacity>
                    );
                  })}
                  {plateItems.length === 0 && (
                    <Text style={styles.emptyPlateText}>Vazio</Text>
                  )}
                </View>

              </View>

              <TouchableOpacity
                style={[styles.serveBtn, plateItems.length === 0 && styles.serveBtnDisabled]}
                onPress={handleServe}
              >
                <Text style={styles.serveText}>Servir!</Text>
              </TouchableOpacity>
            </View>

          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Fechar Geladeira</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#1c1c1c",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    height: "75%", 
  },
  header: {
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 1.5,
  },
  subTitle: {
    color: "#aaa",
    fontSize: 14,
    marginTop: 4,
  },
  splitArea: {
    flex: 1,
    flexDirection: "row", 
    marginTop: 10,
  },
  leftSide: {
    flex: 1.2,
    borderRightWidth: 1,
    borderColor: "#333",
    paddingRight: 10,
  },
  
  // Novos estilos para categorizar a geladeira
  categoryContainer: {
    marginBottom: 15,
  },
  categoryTitle: {
    color: "#FF9800",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 4,
  },
  fridgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  rightSide: {
    flex: 1,
    paddingLeft: 10,
    justifyContent: "space-between",
    alignItems: "center",
  },
  card: {
    width: "48%", // Para caber 2 por linha garantido
    marginBottom: 12,
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    padding: 8,
    alignItems: "center",
    zIndex: 10, 
  },
  image: {
    width: 60,
    height: 60,
    resizeMode: "contain",
  },
  name: {
    color: "#fff",
    fontWeight: "bold",
    marginTop: 6,
    fontSize: 12,
    textAlign: "center"
  },
  quantity: {
    color: "#4AFF88",
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 2,
    marginVertical: '5%',
  },

  effect: {
    color: "#aaa",
    fontSize: 10,
  },
  plateArea: {
    alignItems: "center",
    width: "100%",
  },
  plateText: {
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 10,
  },
  plate: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#c7c7c7",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
  },
  emptyPlateText: {
    color: "#666",
    fontStyle: "italic",
  },
  plateFoodImage: {
    width: 40,
    height: 40,
    resizeMode: "contain",
    margin: 2,
  },
  serveBtn: {
    backgroundColor: "#4AFF88",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  serveBtnDisabled: {
    backgroundColor: "#555",
  },
  serveText: {
    fontWeight: "900",
    color: "#000",
    textTransform: "uppercase",
  },
  closeBtn: {
    backgroundColor: "#FF9800",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  closeText: {
    fontWeight: "bold",
    color: "#fff",
  },
});
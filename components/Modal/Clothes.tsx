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

import { CLOTHES_IMAGES } from "@/src/components/clothes/clothesMap";
import { fetchClothes } from "@/src/services/clothesService";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectClothes: (food: any) => void;
};

export default function ClothesModal({ visible, onClose, onSelectClothes }: Props) {
  const [clothes, setClothes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadClothes();
    }
  }, [visible]);

  async function loadClothes() {
    try {
      setLoading(true);
      const result = await fetchClothes();
      setClothes(result);
    } catch (err) {
      console.error("Erro ao carregar o guarda-roupas.", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>

          <Text style={styles.title}>Selecione uma roupa.</Text>

          {loading ? (
            <ActivityIndicator size="large" />
          ) : (
            <FlatList
              data={clothes}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              renderItem={({ item }) => {
                const sprites = CLOTHES_IMAGES[item.slug];
                const image = sprites?.[0];

                return (
                  <TouchableOpacity
                    style={styles.card}
                    onPress={() => console.log(item)}
                  >
                    <Image source={image} style={styles.image} />
                    <Text style={styles.name}>{item.name}.</Text>
                    <Text style={styles.effect}>+{item.temperature} temperatura.</Text>
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
    alignItems: 'baseline',
    justifyContent: 'flex-end'
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


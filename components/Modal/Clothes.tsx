import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { CLOTHES_IMAGES } from "@/src/components/clothes/clothesMap";
import { fetchClothes } from "@/src/services/clothesService";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectClothes: (clothing: any, category: string) => void;
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
      // result = { PANTS: [...], JACKET: [...] }

      const sections = Object.entries(result).map(([category, items]) => ({
        title: category,
        data: items as any[],
      }));

      setClothes(sections);
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

          <Text style={styles.title}>Guarda Roupas</Text>
          <Text style={styles.subTitle}>Selecione uma roupa:</Text>

          {loading ? (
            <ActivityIndicator size="large" />
          ) : (
            <SectionList
              sections={clothes}
              keyExtractor={(item) => item.id.toString()}
              renderItem={() => null}
              renderSectionHeader={({ section }) => (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>
                    {section.title}
                  </Text>

                  <FlatList
                    data={section.data}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={2}
                    scrollEnabled={false} // 👈 MUITO IMPORTANTE
                    renderItem={({ item }) => {
                      const image = CLOTHES_IMAGES[item.slug];

                      return (
                        <TouchableOpacity
                          style={styles.card}
                          onPress={() => onSelectClothes(item, section.title)}
                        >
                          <Image source={image} style={styles.image} />
                          <Text style={styles.name}>{item.name}</Text>
                          <Text style={styles.effect}>
                            +{item.temperature} temperatura
                          </Text>
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>
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

  sectionContainer: {
    marginBottom: 24,
  },

  sectionTitle: {
    width: '100%', // quebra linha antes da seção
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 12,
    marginLeft: 8,
    color: "#fff",
  },

  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  subTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },

  card: {
    flex: 1,
    margin: 6,
    backgroundColor: "#2a2a2a",
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },

  image: {
    width: 90,
    height: 90,
    backgroundColor: '#fff',
    borderRadius: 10,
    resizeMode: 'center'
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


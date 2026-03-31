import { Image, StyleSheet, Text, TouchableOpacity } from "react-native";
import { FOOD_IMAGES } from "./foodMap";

export default function FoodCard({ food, onPress }: any) {
  const image = FOOD_IMAGES[food.image_key]?.[0];
  
  // Lógica para colocar o zero na frente se for menor que 10
  const formattedQuantity = food.quantity < 10 ? `0${food.quantity}` : food.quantity;
  console.log("quantidades: ", food.quantity)
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image source={image} style={styles.image} />
      <Text style={styles.name}>{food.quantity}</Text>
      
      <Text style={styles.quantity}>Disponível: {formattedQuantity}</Text>
      
      <Text style={styles.effect}>+{food.hunger} Fome</Text>
      <Text style={styles.effect}>+{food.energy} Energia</Text>
      <Text style={styles.effect}>+{food.happiness} Felicidade</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, margin: 8, backgroundColor: "#222", borderRadius: 12, padding: 10, alignItems: "center" },
  image: { width: 90, height: 90, resizeMode: "contain" },
  name: { color: "#fff", fontWeight: "bold", marginTop: 6 },
  quantity: { color: "#4AFF88", fontSize: 13, fontWeight: "bold", marginTop: 2 },
  effect: { color: "#aaa", fontSize: 12, marginTop: 2 },
});
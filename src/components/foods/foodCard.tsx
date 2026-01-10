import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { FOOD_IMAGES } from "./foodMap";

export default function FoodCard({ food, onPress }: any) {
  const image = FOOD_IMAGES[food.image_key]?.[0];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image source={image} style={styles.image} />
      <Text style={styles.name}>{food.name}</Text>
      <Text style={styles.effect}>+{food.hunger} Fome</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 8,
    backgroundColor: "#222",
    borderRadius: 12,
    padding: 10,
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
});

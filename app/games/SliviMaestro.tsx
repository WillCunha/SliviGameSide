import SliviMaestro from "@/components/Game/SliviMaestro";
import { Emotion } from "@/src/types/emotions";
import { useLocalSearchParams } from "expo-router";

export default function SliviMaestroScreen() {

    const { emotion } = useLocalSearchParams<{ emotion: Emotion }>();

    return (<SliviMaestro  />)

}
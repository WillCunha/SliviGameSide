import SealUnlocked from "@/components/Game/SealUnlocked";
import { Emotion } from "@/src/types/emotions";
import { useLocalSearchParams } from "expo-router";

export default function SliviMaestroScreen() {

    const { emotion } = useLocalSearchParams<{ emotion: Emotion }>();

    return (<SealUnlocked  />)

}
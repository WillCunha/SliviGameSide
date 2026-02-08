import SliviPulse from "@/components/Game/SliviPulse";
import { Emotion } from "@/src/types/emotions";
import { useLocalSearchParams } from "expo-router";

export default function SliviPulseScreen() {

    const { emotion } = useLocalSearchParams<{ emotion: Emotion }>();

    return (<SliviPulse emotion={emotion || 'NEUTRO'} />)

}
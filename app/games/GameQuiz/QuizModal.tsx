import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface QuizModalProps {
  pergunta: any;
  onAnswer: (correct: boolean) => void;
}

export default function QuizModal({ pergunta, onAnswer }: QuizModalProps) {
  const [timeLeft, setTimeLeft] = useState(15);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0 && !answered) {
      setAnswered(true);
      onAnswer(false); // Estourou o tempo = errou direto
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, answered, onAnswer]);

  const handleSelectAnswer = (label: string) => {
    if (answered) return;
    setAnswered(true);

    const isCorrect = label === pergunta.resposta_correta;
    onAnswer(isCorrect);
  };

  return (
    <Modal transparent visible animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          
          <View style={styles.header}>
            <Text style={styles.timerText}>Tempo: {timeLeft}s</Text>
            <View style={[styles.timerBar, { width: `${(timeLeft / 15) * 100}%`, backgroundColor: timeLeft < 5 ? '#FF4136' : '#FFDC00' }]} />
          </View>

          <View style={styles.questionBox}>
            <Text style={styles.levelLabel}>{pergunta.nivel.toUpperCase()}</Text>
            <Text style={styles.enunciado}>{pergunta.enunciado}</Text>
          </View>

          <View style={styles.optionsBox}>
            {pergunta.alternativas.map((alt: any) => (
              <TouchableOpacity 
                key={alt.label} 
                style={styles.optionButton}
                onPress={() => handleSelectAnswer(alt.label)}
              >
                <View style={styles.optionLabelBox}>
                  <Text style={styles.optionLabel}>{alt.label}</Text>
                </View>
                <Text style={styles.optionText}>{alt.texto}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.footerText}>VALE {pergunta.pontos} PONTOS</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Seus estilos originais mantidos!
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20, borderWidth: 2, borderColor: '#303050' },
  header: { marginBottom: 20 },
  timerText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' },
  timerBar: { height: 6, borderRadius: 3 },
  questionBox: { marginBottom: 25, alignItems: 'center' },
  levelLabel: { color: '#E94560', fontWeight: 'bold', fontSize: 12, marginBottom: 10 },
  enunciado: { color: '#FFF', fontSize: 20, fontWeight: 'bold', textAlign: 'center', lineHeight: 28 },
  optionsBox: { width: '100%' },
  optionButton: { flexDirection: 'row', backgroundColor: '#16213E', padding: 15, borderRadius: 12, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#252545' },
  optionLabelBox: { backgroundColor: '#E94560', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  optionLabel: { color: '#FFF', fontWeight: 'bold' },
  optionText: { color: '#FFF', fontSize: 16, flex: 1 },
  footerText: { color: '#4CAF50', textAlign: 'center', fontWeight: 'bold', marginTop: 10, letterSpacing: 1 }
});
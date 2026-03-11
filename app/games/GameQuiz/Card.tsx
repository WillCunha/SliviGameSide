import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_W = width * 0.26;

const Card = ({ pergunta, onPress, isBack, disabled }: any) => {
  if (isBack) {
    return (
      <View style={[styles.card, styles.back]}>
        <Image source={require('@/assets/images/iconeWhite.png')} style={styles.logo} resizeMode="contain" />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, styles.front, disabled && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.headerCard}>
        <Text style={styles.pts}>{pergunta.pontos} pts</Text>
        <Text style={styles.nivel}>{pergunta.nivel}</Text>
      </View>
      <Text style={styles.tema}>{pergunta.tema}</Text>
      <Text style={styles.enunciado}>{pergunta.enunciado}</Text>
      <View style={styles.footer}><Text style={styles.mini}>SLIVI</Text></View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { width: CARD_W, height: CARD_W * 1.4, borderRadius: 8, elevation: 4, marginHorizontal: 3 },
  back: { backgroundColor: '#E94560', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF' },
  front: { backgroundColor: '#FFF', padding: 8, justifyContent: 'space-between' },
  logo: { width: '60%', height: '60%' },
  headerCard: {display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomColor: '#eee', borderBottomWidth: 1},
  pts: { fontSize: 13, fontWeight: '700', color: '#333', textAlign: 'center',  },
  nivel: { fontSize: 12, fontWeight: '700', color: '#333', textAlign: 'center', textTransform: 'capitalize' },
  tema: { fontSize: 12, fontWeight: 'bold', color: '#666', textAlign: 'center'  },
  enunciado: { fontSize: 12, fontWeight: 'bold', color: '#666', textAlign: 'center' },
  footer: { borderTopWidth: 1, borderColor: '#EEE', alignItems: 'center' },
  mini: { fontSize: 8, color: '#999' }
});

export default Card;
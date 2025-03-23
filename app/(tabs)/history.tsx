import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/app/constants/Colors';

export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Task History</Text>
      <Text style={styles.subtitle}>View your completed and ongoing tasks</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 24,
    paddingTop: 80,
  },
  title: {
    color: Colors.text,
    fontSize: 32,
    fontFamily: 'SpaceGrotesk-Bold',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Regular',
  },
}); 
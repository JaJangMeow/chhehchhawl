import { Image, View, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface BackgroundImageProps {
  imageUri: string;
}

export default function BackgroundImage({ imageUri }: BackgroundImageProps) {
  return (
    <>
      <Animated.View entering={FadeIn.duration(800)}>
        <Image
          source={{ uri: imageUri }}
          style={styles.backgroundImage}
        />
      </Animated.View>
      <View style={styles.overlay} />
    </>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.2,
  },
  overlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
}); 
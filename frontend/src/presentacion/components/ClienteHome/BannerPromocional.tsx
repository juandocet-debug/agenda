import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { colors } from '../../theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');

interface BannerAction {
  image: any;
  action: () => void;
}

interface BannerPromocionalProps {
  bannersData: BannerAction[];
  isActive: boolean;
}

export const BannerPromocional: React.FC<BannerPromocionalProps> = ({ bannersData, isActive }) => {
  const bannerScrollRef = useRef<ScrollView>(null);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      let nextIndex = activeBannerIndex + 1;
      if (nextIndex >= bannersData.length) {
        nextIndex = 0;
      }
      setActiveBannerIndex(nextIndex);
      bannerScrollRef.current?.scrollTo({
        x: nextIndex * (SCREEN_W - 40),
        animated: true,
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [activeBannerIndex, isActive, bannersData.length]);

  const handleBannerScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / slideSize);
    if (index >= 0 && index < bannersData.length && index !== activeBannerIndex) {
      setActiveBannerIndex(index);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Para ti 🔥</Text>
      <ScrollView
        ref={bannerScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        snapToInterval={SCREEN_W - 40}
        snapToAlignment="center"
        decelerationRate="fast"
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleBannerScroll}
        scrollEventThrottle={16}
      >
        {bannersData.map((b, i) => (
          <TouchableOpacity 
            key={i} 
            style={styles.bannerItem} 
            onPress={b.action} 
            activeOpacity={0.9}
          >
            <Image 
              source={b.image} 
              style={styles.bannerImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Indicador de diapositiva del Banner */}
      <View style={styles.bannerDotsRow}>
        {bannersData.map((_, i) => (
          <View 
            key={i} 
            style={[
              styles.bannerDot, 
              activeBannerIndex === i && styles.bannerDotActive
            ]} 
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 24, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginHorizontal: 20, marginBottom: 12 },
  scrollView: { height: 190 },
  scrollContent: { paddingHorizontal: 20, gap: 16, alignItems: 'center' },
  bannerItem: { width: SCREEN_W - 40, height: 170, borderRadius: 20, overflow: 'hidden' },
  bannerImage: { width: '100%', height: '100%' },
  bannerDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
  },
  bannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
  },
  bannerDotActive: {
    backgroundColor: colors.primary,
    width: 14,
  },
});

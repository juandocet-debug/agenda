import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { shadows } from '../../../theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W * 0.35;

interface CarouselCardsProps {
  onAction: (action: string) => void;
}

const CAROUSEL_CARDS = [
  {
    id: '1',
    title: 'Mis Citas',
    subtitle: 'Revisa y gestiona\ntus reservas activas',
    image: require('../../../../assets/cardsCliente/UpDos.png'),
    action: 'scrollDown',
  },
  {
    id: '2',
    title: 'Explorar',
    subtitle: 'Descubre negocios\ncerca de ti',
    image: require('../../../../assets/cardsCliente/UpTres.png'),
    action: 'ExplorarEmpresas',
  },
  {
    id: '3',
    title: 'Mi Carrito',
    subtitle: 'Completa tu\nreserva fácilmente',
    image: require('../../../../assets/cardsCliente/UpSeis.png'),
    action: 'Carrito',
  },
];

export const CarouselCards: React.FC<CarouselCardsProps> = ({ onAction }) => {
  return (
    <View style={styles.container}>
      {CAROUSEL_CARDS.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.card, { width: CARD_W, flexShrink: 0 }]}
          activeOpacity={0.92}
          onPress={() => onAction(item.action)}
        >
          <View style={styles.cardTopSolid} />
          <Image source={item.image} style={styles.cardOverlayImage} resizeMode="contain" />
          <View style={styles.cardBottom}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: 4,
    paddingTop: 45,
    gap: 12,
    overflowX: 'auto' as any,
    overflowY: 'hidden' as any,
    WebkitOverflowScrolling: 'touch' as any,
    scrollbarWidth: 'none' as any,
    msOverflowStyle: 'none' as any,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'visible',
  },
  cardTopSolid: {
    width: '100%',
    height: 75,
    backgroundColor: '#4338F5',
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
  },
  cardOverlayImage: {
    position: 'absolute',
    top: -85,
    left: 0,
    right: 0,
    width: '100%',
    height: 160,
    zIndex: 10,
  },
  cardBottom: {
    padding: 14,
    borderBottomLeftRadius: 17,
    borderBottomRightRadius: 17,
    backgroundColor: '#FFFFFF',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 3 },
  cardSubtitle: { fontSize: 11, color: '#6B7280', lineHeight: 15 },
});

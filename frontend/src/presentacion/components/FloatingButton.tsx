import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';

interface FloatingButtonProps {
  onPress: () => void;
  style?: ViewStyle;
}

export const FloatingButton = ({ onPress, style }: FloatingButtonProps) => {
  return (
    <TouchableOpacity 
      activeOpacity={0.85} 
      style={[styles.button, shadows.strong, style]} 
      onPress={onPress}
    >
      <Feather name="plus" size={32} color={colors.surface} style={styles.icon} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 25, // Elevación exacta
    alignSelf: 'center',
    borderWidth: 4,
    borderColor: colors.surface, // Efecto de halo blanco alrededor
  },
  icon: {
    marginTop: 0,
  }
});

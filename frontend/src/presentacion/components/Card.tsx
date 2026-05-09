import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { colors, shadows } from '../theme/colors';

interface CardProps extends ViewProps {
  variant?: 'primary' | 'surface' | 'accent';
  children: React.ReactNode;
}

export const Card = ({ variant = 'surface', children, style, ...props }: CardProps) => {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary': return colors.primary;
      case 'accent': return colors.accent;
      default: return colors.surface;
    }
  };

  return (
    <View 
      style={[
        styles.card, 
        { backgroundColor: getBackgroundColor() },
        variant === 'surface' && shadows.soft,
        variant === 'primary' && shadows.strong,
        style
      ]} 
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden', // asegura que el contenido no se salga de los bordes redondeados
  }
});

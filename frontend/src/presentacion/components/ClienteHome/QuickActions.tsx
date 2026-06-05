import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadows } from '../../theme/colors';

interface QuickAction {
  icon: string;
  label: string;
  onPress: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export const QuickActions: React.FC<QuickActionsProps> = ({ actions }) => {
  return (
    <View style={styles.quickSection}>
      <View style={styles.quickRow}>
        {actions.map((qa) => (
          <View key={qa.label} style={styles.quickItem}>
            <TouchableOpacity style={styles.quickCircle} onPress={qa.onPress} activeOpacity={0.8}>
              <LinearGradient
                colors={[colors.primary, colors.primaryLight]}
                style={styles.quickGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Feather name={qa.icon as any} size={22} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.quickLabel}>{qa.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  quickSection: {
    paddingVertical: 18,
    marginVertical: 4,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  quickItem: { alignItems: 'center', gap: 6 },
  quickCircle: { borderRadius: 27, overflow: 'hidden', ...shadows.medium },
  quickGradient: {
    width: 54, height: 54,
    justifyContent: 'center', alignItems: 'center',
  },
  quickLabel: { fontSize: 12, color: '#374151', fontWeight: '600', textAlign: 'center' },
});

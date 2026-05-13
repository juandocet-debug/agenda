import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export const HorariosConfigScreen = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Horarios</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <Feather name="clock" size={60} color="#D1D5DB" style={{ marginBottom: 20 }} />
        <Text style={styles.message}>Configuración de Horarios</Text>
        <Text style={styles.submessage}>Esta función estará disponible en la próxima actualización.</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6'
  },
  backButton: { padding: 5 },
  title: { fontSize: 18, fontWeight: '700', color: colors.primary },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  message: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 10, textAlign: 'center' },
  submessage: { fontSize: 14, color: colors.textSubtitle, textAlign: 'center', lineHeight: 20 }
});

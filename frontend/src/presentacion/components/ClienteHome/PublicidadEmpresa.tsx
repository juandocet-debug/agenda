import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface PublicidadEmpresaProps {
  onRegisterPress: () => void;
  onDismiss: () => void;
}

export const PublicidadEmpresa: React.FC<PublicidadEmpresaProps> = ({ onRegisterPress, onDismiss }) => {
  return (
    <LinearGradient
      colors={['#3B2DBF', '#4535D4', '#2E1FA3']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.negocioWrapper}
    >
      {/* Estrellas decorativas */}
      <Text style={styles.negocioStar1}>✨</Text>
      <Text style={styles.negocioStar2}>⭐</Text>

      {/* ¡Impulsa tu negocio! */}
      <Text style={styles.negocioTagline}>¡Impulsa tu negocio!</Text>
      <View style={styles.negocioTaglineBar} />

      {/* Título principal */}
      <Text style={styles.negocioTitle}>
        ¡Haz crecer tu{`\n`}negocio con{' '}
        <Text style={styles.negocioTitleAccent}>Flowy!</Text>
      </Text>

      {/* Subtítulo */}
      <Text style={styles.negocioSubtitle}>
        Gestiona tu agenda y recibe clientes de{' '}
        <Text style={{ color: '#FFCE00', fontWeight: '700' }}>forma profesional.</Text>
      </Text>

      {/* Beneficios */}
      {[
        { icon: 'clock',       title: 'Recibe reservas 24/7 sin esfuerzo',        body: 'Tus clientes reservan mientras tú te enfocas en lo importante.' },
        { icon: 'calendar',    title: 'Gestiona tu agenda desde cualquier lugar', body: 'Todo tu negocio en tu celular, cuando y donde lo necesites.' },
        { icon: 'users',       title: 'Clientes llegan solos con tu perfil',      body: 'Tu negocio se ve profesional y genera confianza al instante.' },
        { icon: 'trending-up', title: 'Estadísticas y control de tus ingresos',  body: 'Toma mejores decisiones con datos claros de tu negocio.' },
      ].map((b, i) => (
        <View key={i} style={styles.negocioBenefit}>
          <View style={styles.negocioBenefitIcon}>
            <Feather name={b.icon as any} size={20} color="#FFCE00" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.negocioBenefitTitle}>{b.title}</Text>
            <Text style={styles.negocioBenefitBody}>{b.body}</Text>
          </View>
        </View>
      ))}

      {/* Botón dorado */}
      <TouchableOpacity
        style={styles.negocioBtn}
        activeOpacity={0.85}
        onPress={onRegisterPress}
      >
        <Text style={styles.negocioBtnTxt}>🚀  Registrar mi empresa gratis</Text>
      </TouchableOpacity>

      {/* Quizás después */}
      <TouchableOpacity
        style={styles.negocioDismiss}
        onPress={onDismiss}
      >
        <Text style={styles.negocioDismissTxt}>Quizás después</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  negocioWrapper: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 36,
    position: 'relative',
    overflow: 'hidden',
  },
  negocioStar1: {
    position: 'absolute', top: 16, right: 20,
    fontSize: 22, opacity: 0.7,
  },
  negocioStar2: {
    position: 'absolute', top: 50, right: 40,
    fontSize: 14, opacity: 0.5,
  },
  negocioTagline: {
    color: '#FFCE00',
    fontSize: 15,
    fontStyle: 'italic',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  negocioTaglineBar: {
    width: 80,
    height: 2,
    backgroundColor: '#FFCE00',
    alignSelf: 'center',
    marginBottom: 14,
    borderRadius: 2,
  },
  negocioTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 12,
  },
  negocioTitleAccent: {
    color: '#FFCE00',
    fontSize: 28,
    fontWeight: '900',
  },
  negocioSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  negocioBenefit: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  negocioBenefitIcon: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  negocioBenefitTitle: {
    color: '#FFCE00',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  negocioBenefitBody: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    lineHeight: 16,
  },
  negocioBtn: {
    backgroundColor: '#FFCE00',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
    shadowColor: '#FFCE00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  negocioBtnTxt: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  negocioDismiss: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  negocioDismissTxt: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
});

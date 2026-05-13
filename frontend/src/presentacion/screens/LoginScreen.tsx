import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  PanResponder
} from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';

// Arquitectura Hexagonal
import { LoginUseCase } from '../../core/aplicacion/auth/LoginUseCase';
import { DjangoAuthAdapter } from '../../core/infraestructura/auth/DjangoAuthAdapter';
import { guardarTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';

const authAdapter = new DjangoAuthAdapter();
const loginUseCase = new LoginUseCase(authAdapter, guardarTokenLocal);

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const LoginScreen = ({ navigation }: any) => {
  // Estados: 'welcome' | 'login' | 'register'
  const [viewState, setViewState] = useState<'welcome' | 'login' | 'register'>('welcome');
  
  const [email, setEmail] = useState(''); // Usado como Username en Login
  const [password, setPassword] = useState('');
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [username, setUsername] = useState('');
  const [correoEmpresa, setCorreoEmpresa] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Swipe up gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy < -20; // Only capture if swiping up
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -40) {
          switchView('login');
        }
      },
    })
  ).current;

  // Animaciones
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Cambiar de vista con animación
  const switchView = (newState: 'welcome' | 'login' | 'register') => {
    if (newState === 'welcome') {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 400, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true })
      ]).start(() => setViewState(newState));
    } else {
      setViewState(newState);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true })
      ]).start();
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Completa todos los campos.');
      return;
    }
    setIsLoading(true);
    try {
      const rol = await loginUseCase.ejecutar({ email, password });
      setIsLoading(false);
      if (rol === 'superadmin') {
        navigation.replace('MainTabs');
      } else {
        navigation.replace('EmpresaTabs');
      }
    } catch (error: any) {
      setIsLoading(false);
      Alert.alert('Error', error.message || 'Credenciales incorrectas');
    }
  };

  const handleRegister = async () => {
    if (!nombreEmpresa || !username || !correoEmpresa || !password) {
      Alert.alert('Error', 'Completa todos los campos para registrar tu empresa.');
      return;
    }
    setIsLoading(true);
    try {
      await authAdapter.register({
        nombre_empresa: nombreEmpresa,
        username: username,
        email: correoEmpresa,
        password: password
      });
      setIsLoading(false);
      if (Platform.OS === 'web') {
        window.alert('Tu empresa ha sido registrada. Ahora puedes ingresar.');
        switchView('login');
      } else {
        Alert.alert('¡Éxito!', 'Tu empresa ha sido registrada. Ahora puedes ingresar.', [
          { text: 'OK', onPress: () => switchView('login') }
        ]);
      }
    } catch (error: any) {
      setIsLoading(false);
      Alert.alert('Error', error.message || 'No se pudo registrar la empresa.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.background}>
        
        {/* PANTALLA 1: WELCOME (Flowy Style) */}
        <Animated.View 
          style={[styles.welcomeLayer, { opacity: fadeAnim }]} 
          pointerEvents={viewState === 'welcome' ? 'auto' : 'none'}
          {...panResponder.panHandlers}
        >
          <SafeAreaView style={styles.welcomeContent}>
            
            <View style={styles.welcomeTextContainer}>
              <Text style={[typography.h1, { color: '#FFF', fontSize: 20, textAlign: 'center', fontWeight: '800' }]}>
                Agenda tu servicio <Text style={{ color: colors.textTitle }}>en segundos.</Text>
              </Text>
            </View>

            <View style={styles.illustrationContainer}>
               <Image 
                 source={require('../../../assets/images/logo2.png')} 
                 style={styles.illustration} 
                 resizeMode="contain" 
               />
            </View>

            <View style={styles.welcomeBottomBar}>
              <TouchableOpacity style={styles.pillButtonDark} onPress={() => switchView('login')}>
                <Text style={[typography.h3, { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 1 }]}>INGRESAR</Text>
              </TouchableOpacity>
              
              <Text style={[typography.body, { color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginVertical: 15, fontSize: 14 }]}>
                ¿No tienes una cuenta?
              </Text>

              <TouchableOpacity style={styles.pillButtonDark} onPress={() => switchView('register')}>
                <Text style={[typography.h3, { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 1 }]}>REGISTRARSE</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>

        {/* PANTALLAS 2 Y 3: TARJETA BLANCA */}
        {(viewState === 'login' || viewState === 'register') && (
          <View style={styles.cardOverlay}>
            <SafeAreaView style={{ paddingTop: 10 }}>
              <TouchableOpacity style={styles.backButton} onPress={() => switchView('welcome')}>
                <Feather name="chevron-left" size={20} color="#FFF" />
                <Text style={[typography.body, { color: '#FFF', marginLeft: 2, fontSize: 14, fontWeight: '600' }]}>Atrás</Text>
              </TouchableOpacity>
            </SafeAreaView>

            <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}>
              <View style={{ flex: 1, paddingBottom: 10 }}>
                
                <Text style={[typography.h1, styles.title]}>
                  {viewState === 'login' ? 'Ingresar' : 'Crear Cuenta'}
                </Text>

                {/* Formulario Registro */}
                {viewState === 'register' && (
                  <>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Nombre de la Empresa</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          style={styles.input}
                          placeholder="Ej. Barbería VIP"
                          placeholderTextColor={colors.textSubtitle}
                          value={nombreEmpresa}
                          onChangeText={setNombreEmpresa}
                        />
                      </View>
                    </View>

                    <View style={[styles.inputContainer, { marginTop: 15 }]}>
                      <Text style={styles.inputLabel}>Correo Electrónico</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          style={styles.input}
                          placeholder="hola@flowy.com"
                          placeholderTextColor={colors.textSubtitle}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          value={correoEmpresa}
                          onChangeText={setCorreoEmpresa}
                        />
                      </View>
                    </View>

                    <View style={[styles.inputContainer, { marginTop: 15 }]}>
                      <Text style={styles.inputLabel}>Nombre de Usuario</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          style={styles.input}
                          placeholder="usuario_flowy"
                          placeholderTextColor={colors.textSubtitle}
                          autoCapitalize="none"
                          value={username}
                          onChangeText={setUsername}
                        />
                      </View>
                    </View>
                  </>
                )}

                {/* Formulario Login */}
                {viewState === 'login' && (
                  <View style={[styles.inputContainer, { marginTop: 25 }]}>
                    <Text style={styles.inputLabel}>Usuario o Correo</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="admin@flowy.com"
                        placeholderTextColor={colors.textSubtitle}
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                      />
                    </View>
                  </View>
                )}

                {/* Password Input */}
                <View style={[styles.inputContainer, { marginTop: 15 }]}>
                  <Text style={styles.inputLabel}>Contraseña</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••••••"
                      placeholderTextColor={colors.textSubtitle}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                    />
                  </View>
                </View>

                {/* Options Row */}
                <View style={styles.optionsRow}>
                  <TouchableOpacity style={styles.rememberMe}>
                    <View style={styles.checkbox}>
                      <Feather name="check" size={12} color="#FFF" />
                    </View>
                    <Text style={[typography.caption, { color: colors.textSubtitle, marginLeft: 8, fontSize: 12 }]}>
                      {viewState === 'login' ? 'Recordarme' : 'Acepto los términos'}
                    </Text>
                  </TouchableOpacity>
                  {viewState === 'login' && (
                    <TouchableOpacity>
                      <Text style={[typography.caption, { color: colors.primary, fontWeight: '600', fontSize: 12 }]}>¿Olvidó su contraseña?</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Main Action Button */}
                <TouchableOpacity 
                  style={styles.primaryButton} 
                  onPress={viewState === 'login' ? handleLogin : handleRegister}
                  disabled={isLoading}
                >
                  {isLoading ? <ActivityIndicator color="#FFF" /> : (
                    <Text style={[typography.h3, { color: '#FFF', fontSize: 16 }]}>
                      {viewState === 'login' ? 'Ingresar' : 'Registrarse'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Social Login */}
                <View style={styles.separatorContainer}>
                  <View style={styles.separatorLine} />
                  <Text style={[typography.caption, { color: colors.textSubtitle, marginHorizontal: 15, fontSize: 11 }]}>
                    O continúa con
                  </Text>
                  <View style={styles.separatorLine} />
                </View>

                <View style={styles.socialRow}>
                  <TouchableOpacity style={styles.socialButton}><FontAwesome5 name="google" size={20} color="#DB4437" /></TouchableOpacity>
                  <TouchableOpacity style={styles.socialButton}><FontAwesome5 name="apple" size={22} color="#000" /></TouchableOpacity>
                </View>

              </View>
            </Animated.View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary, height: '100%' },
  background: { flex: 1, width: '100%', height: '100%', backgroundColor: colors.primary },
  
  // Welcome Layer
  welcomeLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary
  },
  welcomeContent: {
    flex: 1,
    paddingHorizontal: 35,
    justifyContent: 'space-between',
    paddingBottom: 40,
    paddingTop: 20
  },
  welcomeTextContainer: {
    marginTop: 20,
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
    width: '100%',
    alignSelf: 'center',
  },
  illustration: {
    width: '100%',
    height: '100%',
    maxHeight: 550,
    transform: [{ scale: 1.4 }]
  },
  welcomeBottomBar: {
    width: '100%',
    alignItems: 'center',
  },
  pillButtonDark: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },

  // Card Layer
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
    alignSelf: 'flex-start',
    borderRadius: 20,
    marginLeft: 20,
    marginTop: 10
  },
  bottomSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 30,
    paddingTop: 35,
    flex: 1,
    marginTop: 20, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 30,
  },
  title: {
    color: colors.primary,
    textAlign: 'left',
    fontSize: 28,
    marginBottom: 10,
    fontWeight: '800'
  },
  inputContainer: { width: '100%' },
  inputLabel: {
    color: '#888',
    marginBottom: 6,
    marginLeft: 5,
    fontWeight: '600',
    fontSize: 12,
  },
  inputWrapper: {
    borderWidth: 1.5,
    borderColor: '#E5E9F2',
    borderRadius: 14,
    paddingHorizontal: 15,
    height: 52,
    backgroundColor: '#FAFAFC',
    justifyContent: 'center'
  },
  input: {
    flex: 1,
    color: '#333',
    fontSize: 14,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  rememberMe: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  separatorLine: { flex: 1, height: 1, backgroundColor: '#E5E9F2' },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 25,
    marginBottom: 20
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E5E9F2',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF'
  }
});

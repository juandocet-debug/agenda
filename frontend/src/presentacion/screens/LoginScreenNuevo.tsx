import React, { useState, useRef, useEffect } from 'react';
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
  PanResponder,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

// Arquitectura Hexagonal
import { LoginUseCase } from '../../core/aplicacion/auth/LoginUseCase';
import { DjangoAuthAdapter } from '../../core/infraestructura/auth/DjangoAuthAdapter';
import { guardarTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';
import { useCarrito } from '../../core/aplicacion/carrito/CarritoContext';

const authAdapter = new DjangoAuthAdapter();
const loginUseCase = new LoginUseCase(authAdapter, guardarTokenLocal);

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const LoginScreen = ({ navigation }: any) => {
  const { totalItems } = useCarrito();
  // Estados: 'welcome' | 'login' | 'register'
  const [viewState, setViewState] = useState<'welcome' | 'login' | 'register'>('welcome');
  
  const [email, setEmail] = useState(''); // Usado como Username en Login
  const [password, setPassword] = useState('');
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [username, setUsername] = useState('');
  const [correoEmpresa, setCorreoEmpresa] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Swipe up gesture para abrir
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

  // Swipe down gesture para cerrar la tarjeta blanca
  const panResponderDown = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 20; // Only capture if swiping down
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 40) {
          switchView('welcome');
        }
      },
    })
  ).current;

  // Animaciones
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Google Auth — solo disponible en Web (Android necesita androidClientId de Google Cloud Console)
  const isWeb = Platform.OS === 'web';
  const [request, response, promptAsync] = Google.useAuthRequest(
    isWeb
      ? { webClientId: '776135233648-4cisjd6nonsphm2qklc95irnod7cqtf5.apps.googleusercontent.com' }
      : { webClientId: '776135233648-4cisjd6nonsphm2qklc95irnod7cqtf5.apps.googleusercontent.com',
          androidClientId: '776135233648-4cisjd6nonsphm2qklc95irnod7cqtf5.apps.googleusercontent.com' } // placeholder — no funcional en android pero evita el crash
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken || authentication?.idToken) {
        const token = authentication.idToken || authentication.accessToken;
        if (token) {
          loginConGoogle(token);
        }
      }
    }
  }, [response]);

  const loginConGoogle = async (token: string) => {
    setIsLoading(true); setErrorMessage('');
    try {
      const res = await fetch(`https://agenda-production-ae37.up.railway.app/api/auth/google/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error autenticando con Google.');
      
      await AsyncStorage.setItem('cliente_token', data.access);
      await AsyncStorage.setItem('cliente_nombre', data.datos?.nombre || '');
      await AsyncStorage.setItem('cliente_id', data.datos?.usuario_id ? String(data.datos.usuario_id) : '');
      await AsyncStorage.setItem('cliente_email', data.datos?.email || '');
      
      const rol = data.datos?.rol;
      if (rol === 'superadmin') {
        navigation.replace('MainTabs');
      } else if (rol === 'cliente') {
        if (totalItems > 0) {
          navigation.replace('Carrito');
        } else if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.replace('ClienteHome');
        }
      } else {
        navigation.replace('EmpresaTabs');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Error al iniciar con Google.');
    } finally {
      setIsLoading(false);
    }
  };

  // Cambiar de vista con animación
  const switchView = (newState: 'welcome' | 'login' | 'register') => {
    setErrorMessage('');
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
    setErrorMessage('');
    if (!email || !password) {
      setErrorMessage('Completa todos los campos.');
      return;
    }
    setIsLoading(true);
    try {
      const rol = await loginUseCase.ejecutar({ email, password });
      setIsLoading(false);
      if (rol === 'superadmin') {
        navigation.replace('MainTabs');
      } else if (rol === 'cliente') {
        if (totalItems > 0) {
          navigation.replace('Carrito');
        } else if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.replace('ClienteHome');
        }
      } else {
        navigation.replace('EmpresaTabs');
      }
    } catch (error: any) {
      setIsLoading(false);
      setErrorMessage(error.message || 'Credenciales incorrectas');
    }
  };

  const handleRegister = async () => {
    setErrorMessage('');
    if (!nombreEmpresa || !username || !correoEmpresa || !password) {
      setErrorMessage('Completa todos los campos para registrar tu empresa.');
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
      setErrorMessage(error.message || 'No se pudo registrar la empresa.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      
      {/* PANTALLA 1: WELCOME (Con Fondo Degradado) */}
      {viewState === 'welcome' && (
        <LinearGradient 
          colors={['#4C5BEE', '#2532B3']} 
          style={styles.backgroundGradient}
        >
          <Animated.View 
            style={[styles.welcomeLayer, { opacity: fadeAnim }]} 
            {...panResponder.panHandlers}
          >
            <SafeAreaView style={styles.welcomeContent}>
              
              <View style={styles.welcomeTextContainer}>
                <Text style={styles.appTitle}>Flowy</Text>
                <Text style={styles.welcomeSubtitle}>
                  Agenda tu servicio <Text style={{ fontWeight: '700', color: '#FFF' }}>en segundos.</Text>
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
                  <Text style={styles.pillButtonText}>INGRESAR</Text>
                </TouchableOpacity>
                
                <Text style={styles.orText}>
                  ¿No tienes una cuenta?
                </Text>

                <TouchableOpacity style={styles.pillButtonDark} onPress={() => switchView('register')}>
                  <Text style={styles.pillButtonText}>REGISTRARSE</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Animated.View>
        </LinearGradient>
      )}

      {/* PANTALLAS 2 Y 3: LOGIN / REGISTRO */}
      {(viewState === 'login' || viewState === 'register') && (
        <LinearGradient 
          colors={['#4C5BEE', '#2532B3']} 
          style={styles.backgroundGradient}
        >
          <SafeAreaView style={styles.cardHeaderArea}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity style={styles.backBtnRound} onPress={() => switchView('welcome')}>
                <Feather name="arrow-left" size={22} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerStateText}>
                {viewState === 'login' ? 'Iniciar Sesión' : 'Nueva Cuenta'}
              </Text>
            </View>
            
            {/* Logo/Icono central de cabecera tipo la pantalla de la derecha */}
            <View style={styles.smallHeaderIllustrationContainer}>
               <Image 
                 source={require('../../../assets/images/logo2.png')} 
                 style={styles.smallHeaderIllustration} 
                 resizeMode="contain" 
               />
            </View>
          </SafeAreaView>

          <Animated.View 
            style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}
            {...panResponderDown.panHandlers}
          >
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollForm}
            >
              <Text style={styles.formGreeting}>
                {viewState === 'login' ? '¡Hola de nuevo!' : 'Crea tu Cuenta'}
              </Text>
              <Text style={styles.formSubGreeting}>
                {viewState === 'login' ? 'Ingresa tus credenciales para continuar' : 'Registra tu negocio en nuestra plataforma'}
              </Text>

              {errorMessage ? (
                <Text style={styles.errorBox}>
                  {errorMessage}
                </Text>
              ) : null}

              {/* Formulario Registro */}
              {viewState === 'register' && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Nombre de la Empresa</Text>
                    <View style={styles.inputWrapper}>
                      <Feather name="briefcase" size={18} color="#828C9A" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Ej. Barbería VIP"
                        placeholderTextColor={colors.textSubtitle}
                        value={nombreEmpresa}
                        onChangeText={setNombreEmpresa}
                      />
                    </View>
                  </View>

                  <View style={[styles.inputContainer, { marginTop: 16 }]}>
                    <Text style={styles.inputLabel}>Correo Electrónico</Text>
                    <View style={styles.inputWrapper}>
                      <Feather name="mail" size={18} color="#828C9A" style={styles.inputIcon} />
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

                  <View style={[styles.inputContainer, { marginTop: 16 }]}>
                    <Text style={styles.inputLabel}>Nombre de Usuario</Text>
                    <View style={styles.inputWrapper}>
                      <Feather name="user" size={18} color="#828C9A" style={styles.inputIcon} />
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
                <View style={[styles.inputContainer, { marginTop: 8 }]}>
                  <Text style={styles.inputLabel}>Usuario o Correo</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="mail" size={18} color="#828C9A" style={styles.inputIcon} />
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
              <View style={[styles.inputContainer, { marginTop: 16 }]}>
                <Text style={styles.inputLabel}>Contraseña</Text>
                <View style={styles.inputWrapper}>
                  <Feather name="lock" size={18} color="#828C9A" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••••••"
                    placeholderTextColor={colors.textSubtitle}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Feather name={showPassword ? "eye" : "eye-off"} size={18} color="#828C9A" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Options Row */}
              <View style={styles.optionsRow}>
                <TouchableOpacity style={styles.rememberMe} onPress={() => {}}>
                  <View style={[styles.checkbox, { backgroundColor: colors.primary }]}>
                    <Feather name="check" size={12} color="#FFF" />
                  </View>
                  <Text style={styles.optionsText}>
                    {viewState === 'login' ? 'Recordarme' : 'Acepto los términos'}
                  </Text>
                </TouchableOpacity>
                {viewState === 'login' && (
                  <TouchableOpacity>
                    <Text style={styles.forgotBtn}>¿Olvidó su contraseña?</Text>
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
                  <Text style={styles.primaryButtonText}>
                    {viewState === 'login' ? 'Ingresar' : 'Registrarse'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Social Login */}
              <View style={styles.separatorContainer}>
                <View style={styles.separatorLine} />
                <Text style={styles.separatorText}>O continúa con</Text>
                <View style={styles.separatorLine} />
              </View>

              <View style={styles.socialRow}>
                <TouchableOpacity style={styles.socialButton} onPress={() => promptAsync()}>
                  <FontAwesome5 name="google" size={18} color="#DB4437" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton}>
                  <FontAwesome5 name="apple" size={20} color="#000" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.toggleStateBtn}
                onPress={() => switchView(viewState === 'login' ? 'register' : 'login')}
              >
                <Text style={styles.toggleStateText}>
                  {viewState === 'login' ? '¿No tienes cuenta? Registrate aquí' : '¿Ya tienes una cuenta? Ingresa aquí'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </LinearGradient>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#4C5BEE' },
  backgroundGradient: { flex: 1, width: '100%' },
  
  // Welcome/Onboarding
  welcomeLayer: {
    flex: 1,
  },
  welcomeContent: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'space-between',
    paddingBottom: 40,
    paddingTop: 40
  },
  welcomeTextContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  illustration: {
    width: '90%',
    height: '90%',
    maxHeight: 280,
  },
  welcomeBottomBar: {
    width: '100%',
    alignItems: 'center',
  },
  pillButtonDark: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  pillButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  orText: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginVertical: 14,
    fontSize: 14,
  },

  // Header for Login/Register State
  cardHeaderArea: {
    height: '35%',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'web' ? 10 : 30,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backBtnRound: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerStateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  smallHeaderIllustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  smallHeaderIllustration: {
    width: 140,
    height: 100,
  },

  // Form Card / Bottom Sheet
  bottomSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 24,
  },
  scrollForm: {
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 40,
  },
  formGreeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E2532',
    marginBottom: 6,
  },
  formSubGreeting: {
    fontSize: 13,
    color: '#828C9A',
    marginBottom: 24,
  },
  errorBox: {
    color: '#FF3B30',
    fontSize: 13,
    marginBottom: 16,
    fontWeight: '500',
    backgroundColor: '#FFEBEA',
    padding: 12,
    borderRadius: 12,
    overflow: 'hidden',
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
  },
  inputLabel: {
    color: '#1E2532',
    marginBottom: 8,
    marginLeft: 4,
    fontWeight: '600',
    fontSize: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
    backgroundColor: '#F4F6FB',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#1E2532',
    fontSize: 14,
    height: '100%',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 24,
  },
  rememberMe: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsText: {
    color: '#828C9A',
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  forgotBtn: {
    color: '#4C5BEE',
    fontWeight: '600',
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: '#4C5BEE',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4C5BEE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 26,
    marginBottom: 18,
  },
  separatorLine: { flex: 1, height: 1, backgroundColor: '#E8ECF2' },
  separatorText: {
    color: '#828C9A',
    marginHorizontal: 12,
    fontSize: 12,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E8ECF2',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleStateBtn: {
    alignItems: 'center',
    marginTop: 10,
  },
  toggleStateText: {
    color: '#4C5BEE',
    fontSize: 13,
    fontWeight: '600',
  },
});


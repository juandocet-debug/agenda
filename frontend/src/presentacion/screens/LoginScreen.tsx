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
  ScrollView,
  ImageBackground
} from 'react-native';

// En web, useNativeDriver no soporta translateY — usar JS driver
const USE_NATIVE_DRIVER = Platform.OS !== 'web';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../core/aplicacion/auth/AuthContext';

// Arquitectura Hexagonal
import { LoginUseCase } from '../../core/aplicacion/auth/LoginUseCase';
import { DjangoAuthAdapter } from '../../core/infraestructura/auth/DjangoAuthAdapter';
import { guardarTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';
import { useCarrito } from '../../core/aplicacion/carrito/CarritoContext';

const authAdapter = new DjangoAuthAdapter();
const loginUseCase = new LoginUseCase(authAdapter, guardarTokenLocal);

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const LoginScreen = ({ navigation, route }: any) => {
  const { totalItems } = useCarrito();
  const { onLoginSuccess } = useAuth();
  // modoInicial puede venir como param desde ClienteHome -> Modal Empresa
  const modoInicial = route?.params?.modoInicial ?? 'welcome';
  // Estados: 'welcome' | 'login' | 'register'
  const [viewState, setViewState] = useState<'welcome' | 'login' | 'register'>(modoInicial);
  
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
  const welcomeOpacity = useRef(new Animated.Value(1)).current;
  const loginOpacity = useRef(new Animated.Value(0)).current;

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
      // Actualizar AuthContext directamente como en handleLogin normal
      onLoginSuccess(rol);
      
      if (rol === 'cliente' && totalItems > 0) {
        // Solo redirigir explícitamente si hay algo en el carrito
        navigation.replace('Carrito');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Error al iniciar con Google.');
    } finally {
      setIsLoading(false);
    }
  };

  // Cambiar de vista con animación de transición cruzada y deslizamiento
  const switchView = (newState: 'welcome' | 'login' | 'register') => {
    setErrorMessage('');
    if (newState === 'welcome') {
      // Devolver a pantalla de bienvenida
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 400, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(welcomeOpacity, { toValue: 1, duration: 400, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(loginOpacity, { toValue: 0, duration: 400, useNativeDriver: USE_NATIVE_DRIVER })
      ]).start(() => setViewState(newState));
    } else {
      if (viewState === 'welcome') {
        // Desde bienvenida hacia Login o Registro
        slideAnim.setValue(SCREEN_HEIGHT);
        setViewState(newState);
        const delay = Platform.OS === 'web' ? 50 : 0;
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(welcomeOpacity, { toValue: 0, duration: 400, useNativeDriver: USE_NATIVE_DRIVER }),
            Animated.timing(loginOpacity, { toValue: 1, duration: 400, useNativeDriver: USE_NATIVE_DRIVER })
          ]).start();
        }, delay);
      } else {
        // Transición simple de Login a Registro y viceversa sin mover opacidades generales
        setViewState(newState);
      }
    }
  };

  const handleLogin = async () => {
    setErrorMessage('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setErrorMessage('Completa todos los campos.');
      return;
    }
    setIsLoading(true);
    try {
      const rol = await loginUseCase.ejecutar({ email: normalizedEmail, password });
      setIsLoading(false);
      // Actualizar AuthContext de forma INMEDIATA — sin depender de navigation ni onStateChange
      onLoginSuccess(rol);
    } catch (error: any) {
      setIsLoading(false);
      setErrorMessage(error.message || 'Credenciales incorrectas');
    }
  };

  const handleRegister = async () => {
    setErrorMessage('');
    const normalizedCorreo = correoEmpresa.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();
    if (!nombreEmpresa || !normalizedUsername || !normalizedCorreo || !password) {
      setErrorMessage('Completa todos los campos para registrar tu empresa.');
      return;
    }
    setIsLoading(true);
    try {
      await authAdapter.register({
        nombre_empresa: nombreEmpresa,
        username: normalizedUsername,
        email: normalizedCorreo,
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
      
      {/* CAPA DE LOGIN / REGISTRO (FONDO PAGE3) */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: loginOpacity }]} pointerEvents={viewState !== 'welcome' ? 'auto' : 'none'}>
        <ImageBackground 
          source={require('../../../assets/images/page3.png')} 
          style={styles.backgroundGradient}
          resizeMode="cover"
        >
          <SafeAreaView style={{ flex: 1 }}>
            {/* Back button on top left */}
            <View style={styles.headerTopRowFloating}>
              <TouchableOpacity 
                style={styles.backBtnRoundFloating} 
                onPress={() => switchView('welcome')}
                activeOpacity={0.7}
              >
                <Feather name="arrow-left" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Spacer to push card to the bottom */}
            <View style={{ flex: 1 }} />

            <Animated.View 
              style={[styles.floatingCard, { transform: [{ translateY: slideAnim }] }]}
              {...panResponderDown.panHandlers}
            >
              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollFormFloating}
              >
                {errorMessage ? (
                  <Text style={styles.errorBox}>
                    {errorMessage}
                  </Text>
                ) : null}

                {/* Formulario Registro */}
                {viewState === 'register' && (
                  <>
                    <View style={styles.floatingInputContainer}>
                      <Feather name="briefcase" size={20} color="#4C5BEE" style={styles.floatingInputIcon} />
                      <TextInput
                        style={styles.floatingInput}
                        placeholder="Nombre de la Empresa"
                        placeholderTextColor="#94A3B8"
                        value={nombreEmpresa}
                        onChangeText={setNombreEmpresa}
                      />
                    </View>

                    <View style={[styles.floatingInputContainer, { marginTop: 12 }]}>
                      <Feather name="mail" size={20} color="#4C5BEE" style={styles.floatingInputIcon} />
                      <TextInput
                        style={styles.floatingInput}
                        placeholder="Correo electrónico"
                        placeholderTextColor="#94A3B8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={correoEmpresa}
                        onChangeText={setCorreoEmpresa}
                      />
                    </View>

                    <View style={[styles.floatingInputContainer, { marginTop: 12 }]}>
                      <Feather name="user" size={20} color="#4C5BEE" style={styles.floatingInputIcon} />
                      <TextInput
                        style={styles.floatingInput}
                        placeholder="Nombre de usuario"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="none"
                        value={username}
                        onChangeText={setUsername}
                      />
                    </View>
                  </>
                )}

                {/* Formulario Login */}
                {viewState === 'login' && (
                  <View style={styles.floatingInputContainer}>
                    <Feather name="mail" size={20} color="#4C5BEE" style={styles.floatingInputIcon} />
                    <TextInput
                      style={styles.floatingInput}
                      placeholder="Correo electrónico"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>
                )}

                {/* Password Input */}
                <View style={[styles.floatingInputContainer, { marginTop: 12 }]}>
                  <Feather name="lock" size={20} color="#4C5BEE" style={styles.floatingInputIcon} />
                  <TextInput
                    style={styles.floatingInput}
                    placeholder="Contraseña"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Options Row */}
                <View style={styles.optionsRowFloating}>
                  <TouchableOpacity style={styles.rememberMeFloating} onPress={() => {}}>
                    <View style={[styles.checkboxFloating, { backgroundColor: '#2B5BEE' }]}>
                      <Feather name="check" size={10} color="#FFF" />
                    </View>
                    <Text style={styles.optionsTextFloating}>
                      {viewState === 'login' ? 'Recordarme' : 'Acepto los términos'}
                    </Text>
                  </TouchableOpacity>
                  {viewState === 'login' && (
                    <TouchableOpacity onPress={() => navigation.navigate('RecuperarPassword')}>
                      <Text style={styles.forgotBtnFloating}>¿Olvidaste tu contraseña?</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Main Action Button */}
                <TouchableOpacity 
                  style={styles.primaryButtonFloating} 
                  onPress={viewState === 'login' ? handleLogin : handleRegister}
                  disabled={isLoading}
                >
                  {isLoading ? <ActivityIndicator color="#FFF" /> : (
                    <View style={styles.primaryButtonInnerFloating}>
                      <Text style={styles.primaryButtonTextFloating}>
                        {viewState === 'login' ? 'Iniciar sesión' : 'Registrar empresa'}
                      </Text>
                      <Feather name="arrow-right" size={20} color="#FFF" style={styles.primaryButtonArrowFloating} />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Social Login */}
                <View style={styles.separatorContainerFloating}>
                  <View style={styles.separatorLineFloating} />
                  <Text style={styles.separatorTextFloating}>o continúa con</Text>
                  <View style={styles.separatorLineFloating} />
                </View>

                <View style={styles.socialRowFloating}>
                  <TouchableOpacity style={styles.socialCircleButton} onPress={() => promptAsync()}>
                    <FontAwesome5 name="google" size={20} color="#DB4437" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.socialCircleButton}>
                    <FontAwesome5 name="twitter" size={20} color="#1DA1F2" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={styles.toggleStateBtnFloating}
                  onPress={() => switchView(viewState === 'login' ? 'register' : 'login')}
                >
                  <Text style={styles.toggleStateTextFloating}>
                    {viewState === 'login' ? (
                      <>
                        <Text style={{ color: '#64748B' }}>¿Tienes un negocio? </Text>
                        <Text style={{ color: '#2B5BEE', fontWeight: '600' }}>Registra tu empresa</Text>
                      </>
                    ) : (
                      <>
                        <Text style={{ color: '#64748B' }}>¿Ya tienes una cuenta? </Text>
                        <Text style={{ color: '#2B5BEE', fontWeight: '600' }}>Inicia sesión</Text>
                      </>
                    )}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </SafeAreaView>
        </ImageBackground>
      </Animated.View>

      {/* CAPA DE BIENVENIDA (FONDO PAGE1) */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: welcomeOpacity }]} pointerEvents={viewState === 'welcome' ? 'auto' : 'none'}>
        <ImageBackground 
          source={require('../../../assets/images/page1.png')} 
          style={styles.backgroundGradient}
          resizeMode="contain"
        >
          <View style={styles.welcomeLayer}>
            <SafeAreaView style={styles.welcomeContent}>
              {/* Espaciador flexible para empujar el contenido hacia abajo */}
              <View style={{ flex: 1 }} />
              
              <View style={styles.welcomeBottomBar}>
                <TouchableOpacity style={styles.pillButtonWhite} onPress={() => switchView('login')}>
                  <Text style={styles.pillButtonTextBlue}>Comenzar</Text>
                </TouchableOpacity>
                
                <View style={styles.indicatorRow}>
                  <View style={[styles.indicatorDot, styles.indicatorActive]} />
                  <View style={styles.indicatorDot} />
                  <View style={styles.indicatorDot} />
                </View>
              </View>
            </SafeAreaView>
          </View>
        </ImageBackground>
      </Animated.View>
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
    paddingBottom: Platform.OS === 'web' ? 20 : 10,
  },
  pillButtonWhite: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    maxWidth: 320,
  },
  pillButtonTextBlue: {
    color: '#4C5BEE',
    fontSize: 16,
    fontWeight: 'bold',
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  indicatorActive: {
    backgroundColor: '#FFFFFF',
  },

  // Floating Login Elements style
  headerTopRowFloating: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'web' ? 20 : 10,
  },
  backBtnRoundFloating: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingCard: {
    backgroundColor: '#FFF',
    borderRadius: 32,
    marginHorizontal: 24,
    marginBottom: Platform.OS === 'web' ? 24 : 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    maxHeight: '64%',
  },
  scrollFormFloating: {
    paddingVertical: 2,
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
  floatingInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 6,
    height: 46,
  },
  floatingInputIcon: {
    marginRight: 12,
  },
  floatingInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 15,
    height: '100%',
  },
  optionsRowFloating: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  rememberMeFloating: { flexDirection: 'row', alignItems: 'center' },
  checkboxFloating: {
    width: 18,
    height: 18,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsTextFloating: {
    color: '#64748B',
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '500',
  },
  forgotBtnFloating: {
    color: '#2B5BEE',
    fontWeight: '600',
    fontSize: 13,
  },
  primaryButtonFloating: {
    backgroundColor: '#2B5BEE',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2B5BEE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 4,
  },
  primaryButtonInnerFloating: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
  },
  primaryButtonTextFloating: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  primaryButtonArrowFloating: {
    position: 'absolute',
    right: 20,
  },
  separatorContainerFloating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 12,
  },
  separatorLineFloating: { flex: 1, height: 1, backgroundColor: '#F1F5F9' },
  separatorTextFloating: {
    color: '#94A3B8',
    marginHorizontal: 12,
    fontSize: 13,
  },
  socialRowFloating: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  socialCircleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleStateBtnFloating: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 6,
  },
  toggleStateTextFloating: {
    fontSize: 14,
  },
});



import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ImageBackground, 
  Animated, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions
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
      <ImageBackground source={require('../../../assets/images/bg_login.png')} style={styles.background} resizeMode="cover">
        
        {/* PANTALLA 1: WELCOME (Solo se ve si la tarjeta no ha subido) */}
        <Animated.View style={[styles.welcomeLayer, { opacity: fadeAnim }]} pointerEvents={viewState === 'welcome' ? 'auto' : 'none'}>
          <View style={styles.welcomeTextContainer}>
            <Text style={[typography.h1, { color: '#FFF', fontSize: 36, textAlign: 'center' }]}>¡Bienvenido!</Text>
            <Text style={[typography.body, { color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 15, paddingHorizontal: 30 }]}>
              Ingresa tus datos personales a tu cuenta de empleado
            </Text>
          </View>

          {/* Botones inferiores de la Pestaña 1 (Píldora flotante pequeña) */}
          <View style={styles.welcomeBottomBar}>
            <TouchableOpacity style={styles.welcomeBtnDark} onPress={() => switchView('login')}>
              <Text style={[typography.h3, { color: '#FFF', fontSize: 14 }]}>Ingresar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.welcomeBtnLight} onPress={() => switchView('register')}>
              <Text style={[typography.h3, { color: '#4A72FF', fontSize: 14 }]}>Registrarse</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* PANTALLAS 2 Y 3: TARJETA BLANCA */}
        {(viewState === 'login' || viewState === 'register') && (
          <View style={styles.cardOverlay}>
            <SafeAreaView style={{ paddingTop: 10 }}>
              <TouchableOpacity style={styles.backButton} onPress={() => switchView('welcome')}>
                <Feather name="chevron-left" size={20} color="#FFF" />
                <Text style={[typography.body, { color: '#FFF', marginLeft: 2, fontSize: 14, fontWeight: '600' }]}>Back</Text>
              </TouchableOpacity>
            </SafeAreaView>

            <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}>
              <View style={{ flex: 1, paddingBottom: 10 }}>
                
                <Text style={[typography.h1, styles.title]}>
                  {viewState === 'login' ? 'Bienvenido de vuelta' : 'Comenzar'}
                </Text>

                {/* Formulario Registro Extra Fields */}
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

                    <View style={[styles.inputContainer, { marginTop: 10 }]}>
                      <Text style={styles.inputLabel}>Correo Electrónico</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          style={styles.input}
                          placeholder="barberia@ejemplo.com"
                          placeholderTextColor={colors.textSubtitle}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          value={correoEmpresa}
                          onChangeText={setCorreoEmpresa}
                        />
                      </View>
                    </View>

                    <View style={[styles.inputContainer, { marginTop: 10 }]}>
                      <Text style={styles.inputLabel}>Nombre de Usuario (Para ingresar)</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          style={styles.input}
                          placeholder="ej. barberia_vip"
                          placeholderTextColor={colors.textSubtitle}
                          autoCapitalize="none"
                          value={username}
                          onChangeText={setUsername}
                        />
                      </View>
                    </View>
                  </>
                )}

                {/* Input Email/Username para Login */}
                {viewState === 'login' && (
                  <View style={[styles.inputContainer, { marginTop: 15 }]}>
                    <Text style={styles.inputLabel}>Usuario o Correo</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="ej. barberia_vip o admin@agendapro.com"
                        placeholderTextColor={colors.textSubtitle}
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                      />
                    </View>
                  </View>
                )}

                {/* Input Password */}
                <View style={[styles.inputContainer, { marginTop: 10 }]}>
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
                    <Text style={[typography.caption, { color: colors.textSubtitle, marginLeft: 6, fontSize: 11 }]}>
                      {viewState === 'login' ? 'Recordarme' : 'Acepto el uso de datos personales'}
                    </Text>
                  </TouchableOpacity>
                  {viewState === 'login' && (
                    <TouchableOpacity>
                      <Text style={[typography.caption, { color: '#4A72FF', fontWeight: '600', fontSize: 11 }]}>¿Olvidó la contraseña?</Text>
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
                    <Text style={[typography.h3, { color: '#FFF' }]}>
                      {viewState === 'login' ? 'Ingresar' : 'Registrarse'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Social Login Section */}
                <View style={styles.separatorContainer}>
                  <View style={styles.separatorLine} />
                  <Text style={[typography.caption, { color: colors.textSubtitle, marginHorizontal: 10, fontSize: 10 }]}>
                    {viewState === 'login' ? 'O ingresa con' : 'O regístrate con'}
                  </Text>
                  <View style={styles.separatorLine} />
                </View>

                <View style={styles.socialRow}>
                  <TouchableOpacity style={styles.socialButton}><FontAwesome5 name="facebook" size={20} color="#1877F2" /></TouchableOpacity>
                  <TouchableOpacity style={styles.socialButton}><FontAwesome5 name="twitter" size={20} color="#1DA1F2" /></TouchableOpacity>
                  <TouchableOpacity style={styles.socialButton}>
                    <ImageBackground source={{uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png'}} style={{width: 20, height: 20}} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.socialButton}><FontAwesome5 name="apple" size={20} color="#000" /></TouchableOpacity>
                </View>

                <View style={styles.footerRow}>
                  <Text style={[typography.caption, { color: colors.textSubtitle, fontSize: 11 }]}>
                    {viewState === 'login' ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
                  </Text>
                  <TouchableOpacity onPress={() => switchView(viewState === 'login' ? 'register' : 'login')}>
                    <Text style={[typography.caption, { color: '#4A72FF', fontWeight: '700', fontSize: 11 }]}>
                      {viewState === 'login' ? 'Registrarse' : 'Ingresar'}
                    </Text>
                  </TouchableOpacity>
                </View>

              </View>
            </Animated.View>
          </View>
        )}
      </ImageBackground>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B2A56', height: '100%' }, // height 100% para asegurar llenado en web
  background: { flex: 1, width: '100%', height: '100%', backgroundColor: '#0B2A56' }, // Quitamos scale y obligamos al height 100%
  
  // Capa 1: Welcome
  welcomeLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)'
  },
  welcomeTextContainer: {
    position: 'absolute',
    top: '35%',
    width: '100%',
    alignItems: 'center'
  },
  welcomeBottomBar: {
    position: 'absolute',
    bottom: 50,
    width: '80%', // un poco más pequeña
    height: 50, // de 65 a 50 para botones mas finos y pequeños
    flexDirection: 'row',
    backgroundColor: '#0A1E3F',
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  welcomeBtnDark: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  welcomeBtnLight: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 25,
  },

  // Capa 2: Tarjeta
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(50, 70, 110, 0.8)', // Fondo translúcido similar a la referencia
    alignSelf: 'flex-start',
    borderRadius: 25,
    marginLeft: 20,
    marginTop: 10
  },
  bottomSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 25,
    paddingTop: 25,
    flex: 1,
    marginTop: 20, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 30,
  },
  title: {
    color: '#4A72FF',
    textAlign: 'center',
    fontSize: 24,
    marginBottom: 15,
    fontWeight: '800'
  },
  inputContainer: { width: '100%' },
  inputLabel: {
    color: '#888',
    marginBottom: 4,
    marginLeft: 5,
    fontWeight: '600',
    fontSize: 11,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: '#E5E9F2',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 45,
    backgroundColor: '#FFF',
    justifyContent: 'center'
  },
  input: {
    flex: 1,
    color: '#333',
    fontSize: 13,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 20,
  },
  rememberMe: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#4A72FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#4A72FF',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A72FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  separatorLine: { flex: 1, height: 1, backgroundColor: '#E5E9F2' },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
    marginBottom: 20
  },
  socialButton: {
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  }
});

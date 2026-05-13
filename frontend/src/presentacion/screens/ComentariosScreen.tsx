import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, TextInput, KeyboardAvoidingView,
  Platform, Image, Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';

const BASE_URL = 'https://agenda-production-ae37.up.railway.app/api/publicaciones';
const { width } = Dimensions.get('window');

export const ComentariosScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { publicacion } = route.params;

  const [comentarios, setComentarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [respondiendo, setRespondiendo] = useState<any | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    cargarComentarios();
  }, []);

  const cargarComentarios = async () => {
    try {
      setLoading(true);
      const token = await obtenerTokenLocal();
      const res = await fetch(`${BASE_URL}/${publicacion.id}/comentarios/`, {
        headers: { 'Authorization': `Bearer ${token?.access}` },
      });
      const data = await res.json();
      if (data.ok) setComentarios(data.datos);
    } catch (e: any) {
      console.error('Error comentarios:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      const token = await obtenerTokenLocal();
      const body: any = { texto, autor_nombre: 'Yo' };
      if (respondiendo) body.padre_id = respondiendo.id;

      const res = await fetch(`${BASE_URL}/${publicacion.id}/comentarios/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token?.access}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        if (respondiendo) {
          // Insertar respuesta dentro del comentario padre
          setComentarios(prev => prev.map(c =>
            c.id === respondiendo.id
              ? { ...c, respuestas: [...(c.respuestas || []), data.datos] }
              : c
          ));
        } else {
          setComentarios(prev => [...prev, { ...data.datos, respuestas: [] }]);
        }
        setTexto('');
        setRespondiendo(null);
      }
    } catch {} finally {
      setEnviando(false);
    }
  };

  const iniciarRespuesta = (com: any) => {
    setRespondiendo(com);
    inputRef.current?.focus();
  };

  const formatFecha = (f?: string) => {
    if (!f) return '';
    const d = new Date(f), ahora = new Date();
    const diff = Math.floor((ahora.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'Ahora';
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const handleLikeComentario = async (comentarioId: string, esRespuesta = false, padreId?: string) => {
    try {
      const token = await obtenerTokenLocal();
      const res = await fetch(`${BASE_URL}/comentarios/${comentarioId}/like/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token?.access}` },
      });
      const data = await res.json();
      if (data.ok) {
        setComentarios(prev => prev.map(c => {
          if (!esRespuesta && c.id === comentarioId) {
            return { ...c, total_likes: data.datos.total_likes, usuario_dio_like: data.datos.usuario_dio_like };
          }
          if (esRespuesta && c.id === padreId) {
            return {
              ...c,
              respuestas: (c.respuestas || []).map((r: any) =>
                r.id === comentarioId
                  ? { ...r, total_likes: data.datos.total_likes, usuario_dio_like: data.datos.usuario_dio_like }
                  : r
              ),
            };
          }
          return c;
        }));
      }
    } catch {}
  };

  const renderComentario = ({ item }: { item: any }) => (
    <View style={styles.comItem}>
      {/* Avatar */}
      <View style={styles.comAvatar}>
        <Text style={styles.comAvatarLetter}>
          {(item.autor_nombre || 'U').charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Contenido + like a la derecha */}
      <View style={{ flex: 1 }}>
        <View style={styles.comRow}>
          {/* Burbuja de texto */}
          <View style={styles.comBubble}>
            <Text style={styles.comAutor}>{item.autor_nombre || 'Usuario'}</Text>
            <Text style={styles.comTexto}>{item.texto}</Text>
          </View>
          {/* Corazón like */}
          <TouchableOpacity
            style={styles.likeBtn}
            onPress={() => handleLikeComentario(item.id)}
          >
            <Feather name="heart" size={16} color={item.usuario_dio_like ? '#ED4956' : '#C7C7C7'} />
            {item.total_likes > 0 && (
              <Text style={[styles.likeCount, item.usuario_dio_like && { color: '#ED4956' }]}>
                {item.total_likes}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Meta: fecha + Responder */}
        <View style={styles.comMeta}>
          <Text style={styles.comFecha}>{formatFecha(item.fecha_creacion)}</Text>
          <TouchableOpacity onPress={() => iniciarRespuesta(item)}>
            <Text style={styles.responderBtn}>Responder</Text>
          </TouchableOpacity>
        </View>

        {/* Respuestas */}
        {item.respuestas?.length > 0 && (
          <View style={styles.respuestasContainer}>
            {item.respuestas.map((r: any) => (
              <View key={r.id} style={styles.respuestaRow}>
                <View style={styles.respuestaAvatar}>
                  <Text style={styles.respuestaAvatarLetter}>
                    {(r.autor_nombre || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.comRow}>
                    <View style={styles.comBubble}>
                      <Text style={styles.comAutor}>{r.autor_nombre || 'Usuario'}</Text>
                      <Text style={styles.comTexto}>{r.texto}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.likeBtn}
                      onPress={() => handleLikeComentario(r.id, true, item.id)}
                    >
                      <Feather name="heart" size={14} color={r.usuario_dio_like ? '#ED4956' : '#C7C7C7'} />
                      {r.total_likes > 0 && (
                        <Text style={[styles.likeCount, r.usuario_dio_like && { color: '#ED4956' }]}>
                          {r.total_likes}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.comFecha}>{formatFecha(r.fecha_creacion)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#262626" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comentarios</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Lista de comentarios */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : comentarios.length === 0 ? (
        <View style={styles.emptyComments}>
          <Feather name="message-circle" size={48} color="#C7C7C7" />
          <Text style={styles.emptyTitle}>Sin comentarios aún</Text>
          <Text style={styles.emptySub}>Sé el primero en comentar.</Text>
        </View>
      ) : (
        <FlatList
          data={comentarios}
          keyExtractor={item => item.id}
          renderItem={renderComentario}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Input de comentario */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {respondiendo && (
          <View style={styles.respondingBar}>
            <Text style={styles.respondingText}>
              Respondiendo a <Text style={{ fontWeight: '800' }}>{respondiendo.autor_nombre}</Text>
            </Text>
            <TouchableOpacity onPress={() => setRespondiendo(null)}>
              <Feather name="x" size={16} color="#8E8E8E" />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputBar}>
          <View style={styles.inputAvatar}>
            <Feather name="user" size={16} color={colors.primary} />
          </View>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={respondiendo ? `Responder a ${respondiendo.autor_nombre}...` : 'Agrega un comentario...'}
            placeholderTextColor="#AAAAAA"
            value={texto}
            onChangeText={setTexto}
            multiline
            maxLength={300}
          />
          <TouchableOpacity
            onPress={handleEnviar}
            disabled={enviando || !texto.trim()}
            style={{ paddingHorizontal: 4 }}
          >
            {enviando
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Text style={[styles.sendBtn, !texto.trim() && { color: '#AAAAAA' }]}>Publicar</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: '#DBDBDB',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#262626' },

  /* Post preview */
  pubPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12,
  },
  pubThumb: { width: 54, height: 54, borderRadius: 8 },
  pubTitulo: { fontSize: 13, fontWeight: '700', color: '#262626' },
  pubDesc: { fontSize: 12, color: '#8E8E8E', marginTop: 2 },
  divider: { height: 0.5, backgroundColor: '#DBDBDB' },

  /* Comments list */
  listContent: { padding: 16, paddingBottom: 20 },
  comItem: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  comAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center',
  },
  comAvatarLetter: { fontSize: 15, fontWeight: '800', color: colors.primary },
  comBubble: {
    flex: 1,
    backgroundColor: '#F0F2F5', borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  comRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  likeBtn: {
    alignItems: 'center', justifyContent: 'flex-start',
    paddingTop: 10, minWidth: 28,
  },
  likeCount: { fontSize: 11, color: '#C7C7C7', fontWeight: '600', marginTop: 2 },
  comAutor: { fontSize: 12, fontWeight: '800', color: '#262626' },
  comTexto: { fontSize: 14, color: '#262626', marginTop: 2, lineHeight: 19 },
  comMeta: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 5, paddingLeft: 8 },
  comFecha: { fontSize: 11, color: '#8E8E8E' },
  responderBtn: { fontSize: 12, fontWeight: '700', color: '#8E8E8E' },

  /* Respuestas */
  respuestasContainer: { marginTop: 8, paddingLeft: 4 },
  respuestaRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  respuestaAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center',
  },
  respuestaAvatarLetter: { fontSize: 12, fontWeight: '800', color: colors.primary },

  /* Empty */
  emptyComments: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#262626' },
  emptySub: { fontSize: 13, color: '#8E8E8E' },

  /* Input bar */
  respondingBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#F0F2F5', borderTopWidth: 0.5, borderTopColor: '#DBDBDB',
  },
  respondingText: { fontSize: 12, color: '#8E8E8E' },
  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, gap: 10,
    borderTopWidth: 0.5, borderTopColor: '#DBDBDB',
    backgroundColor: '#FFF',
  },
  inputAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center',
  },
  input: { flex: 1, fontSize: 14, color: '#262626', maxHeight: 80 },
  sendBtn: { color: '#3897F0', fontWeight: '800', fontSize: 14 },
});

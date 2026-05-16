import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';

export const ProfileScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Header Card */}
        <Card variant="primary" style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <Feather name="user" size={32} color={colors.primary} />
            </View>
          </View>
          <Text style={[typography.h2, { color: colors.surface, textAlign: 'center', marginTop: 20 }]}>
            Richard A. Bachmann
          </Text>
          <Text style={[typography.caption, { color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 8 }]}>
            Diseñador UI/UX
          </Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[typography.h2, { color: colors.surface }]}>75k</Text>
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.6)', marginTop: 4 }]}>Seguidores</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[typography.h2, { color: colors.surface }]}>16k</Text>
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.6)', marginTop: 4 }]}>Siguiendo</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[typography.h2, { color: colors.surface }]}>600</Text>
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.6)', marginTop: 4 }]}>Proyectos</Text>
            </View>
          </View>
        </Card>

        {/* Folders Section */}
        <View style={styles.sectionHeader}>
          <Text style={[typography.h3, { color: colors.primary }]}>Carpetas</Text>
          <Text style={[typography.caption, { color: colors.textSubtitle }]}>ver todo</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.foldersContainer} contentContainerStyle={{ paddingRight: 20 }}>
          <Card variant="accent" style={styles.folderCard}>
            <Feather name="folder" size={24} color={colors.primary} style={{ marginBottom: 12 }} />
            <Text style={[typography.body, { color: colors.primary, fontWeight: '500', marginBottom: 4 }]}>Diseños Dribbble</Text>
            <Text style={[typography.caption, { color: colors.textSubtitle, fontSize: 10 }]}>Creado: 28 Feb 2022</Text>
            <View style={styles.folderAvatars}>
               <View style={[styles.miniAvatar, { left: 0, zIndex: 3 }]}><Feather name="user" size={10} color={colors.primary}/></View>
               <View style={[styles.miniAvatar, { left: 10, zIndex: 2 }]}><Feather name="user" size={10} color={colors.primary}/></View>
               <View style={[styles.miniAvatar, { left: 20, zIndex: 1 }]}><Feather name="user" size={10} color={colors.primary}/></View>
            </View>
          </Card>
          <Card variant="surface" style={[styles.folderCard, styles.emptyFolderCard]}>
            <Feather name="folder" size={24} color={colors.textSubtitle} />
          </Card>
        </ScrollView>

        {/* My Team Section */}
        <View style={[styles.sectionHeader, { marginTop: 30 }]}>
          <Text style={[typography.h3, { color: colors.primary }]}>Mi Equipo</Text>
          <Text style={[typography.caption, { color: colors.textSubtitle }]}>ver todo</Text>
        </View>

        <View style={styles.teamList}>
          {/* Team Item 1 */}
          <View style={styles.teamItem}>
            <View style={styles.iconCircle}>
               <Feather name="shopping-bag" size={20} color={colors.primary} />
            </View>
            <View style={styles.teamItemTexts}>
              <Text style={[typography.body, { color: colors.primary, fontWeight: '500' }]}>App E-Commerce</Text>
              <Text style={[typography.caption, { color: colors.textSubtitle, marginTop: 4 }]}>Proyecto en Progreso</Text>
            </View>
            <View style={styles.teamAvatars}>
               <View style={[styles.mediumAvatar, { left: 0, zIndex: 2 }]}><Feather name="user" size={14} color={colors.primary}/></View>
               <View style={[styles.mediumAvatar, { left: -10, zIndex: 1 }]}><Feather name="user" size={14} color={colors.primary}/></View>
            </View>
          </View>

          {/* Team Item 2 */}
          <View style={styles.teamItem}>
            <View style={styles.iconCircle}>
               <Feather name="coffee" size={20} color={colors.primary} />
            </View>
            <View style={styles.teamItemTexts}>
              <Text style={[typography.body, { color: colors.primary, fontWeight: '500' }]}>Proyecto Comida</Text>
              <Text style={[typography.caption, { color: colors.textSubtitle, marginTop: 4 }]}>Completado</Text>
            </View>
            <View style={styles.teamAvatars}>
               <View style={[styles.mediumAvatar, { left: 0, zIndex: 2 }]}><Feather name="user" size={14} color={colors.primary}/></View>
               <View style={[styles.mediumAvatar, { left: -10, zIndex: 1 }]}><Feather name="user" size={14} color={colors.primary}/></View>
            </View>
          </View>
          
           {/* Team Item 3 */}
           <View style={styles.teamItem}>
            <View style={styles.iconCircle}>
               <Feather name="book-open" size={20} color={colors.primary} />
            </View>
            <View style={styles.teamItemTexts}>
              <Text style={[typography.body, { color: colors.primary, fontWeight: '500' }]}>Proyecto E-Book</Text>
              <Text style={[typography.caption, { color: colors.textSubtitle, marginTop: 4 }]}>Proyecto en Progreso</Text>
            </View>
            <View style={styles.teamAvatars}>
               <View style={[styles.mediumAvatar, { left: 0, zIndex: 2 }]}><Feather name="user" size={14} color={colors.primary}/></View>
               <View style={[styles.mediumAvatar, { left: -10, zIndex: 1 }]}><Feather name="user" size={14} color={colors.primary}/></View>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  profileCard: {
    paddingTop: 45,
    paddingBottom: 35,
    marginBottom: 35,
    borderRadius: 32, // Redondeo extremo
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 35,
    paddingHorizontal: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  foldersContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    overflow: 'visible',
  },
  folderCard: {
    marginRight: 15,
    width: 220,
    padding: 20,
    borderRadius: 24,
  },
  emptyFolderCard: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  folderAvatars: {
    flexDirection: 'row',
    marginTop: 15,
    position: 'relative',
    height: 20,
  },
  miniAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  teamList: {
    marginTop: 5,
  },
  teamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 24,
    marginBottom: 15,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  teamItemTexts: {
    flex: 1,
  },
  teamAvatars: {
    flexDirection: 'row',
    position: 'relative',
    width: 40,
    height: 30,
    alignItems: 'center',
  },
  mediumAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.surface,
  }
});

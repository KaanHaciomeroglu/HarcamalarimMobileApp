import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useState, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';
import { getExpenses, getSettings, Expense } from '../../store/storage';
import { Category } from '../../constants/categories';

export default function DashboardScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budget, setBudget] = useState(0);
  const [currency, setCurrency] = useState('₺');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [exps, settings] = await Promise.all([getExpenses(), getSettings()]);
    setExpenses(exps);
    setCategories(settings.categories);
    setBudget(settings.monthlyBudget);
    setCurrency(settings.currency);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const now = new Date();
const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const monthExps = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  const totalMonth = monthExps.reduce((s, e) => s + (e.convertedAmount ?? e.amount), 0);
const budgetUsed = budget > 0 ? Math.min(totalMonth / budget, 1) : 0;
  const budgetOver = budget > 0 && totalMonth > budget;

  const catTotals = categories.map((cat) => {
    const total = monthExps
      .filter((e) => e.categoryId === cat.id)
      .reduce((s, e) => s + (e.convertedAmount ?? e.amount), 0);
    return { ...cat, total };
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  const recent = [...expenses]
    .sort((a, b) => {
      const dateDiff = b.date.localeCompare(a.date);
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 5);

  function fmt(n: number) {
    return n.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Modern Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Hoş Geldin 👋</Text>
            <Text style={styles.headerTitle}>Harcamalarım</Text>
          </View>
        </View>

        {/* Hero Gradient Card */}
        <LinearGradient
          colors={Colors.primaryGradient as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroGlow} />
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>Aylık Toplam Harcama</Text>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{format(now, 'MMMM yyyy', { locale: tr })}</Text>
            </View>
          </View>
          <Text style={styles.heroAmount}>{currency}{fmt(totalMonth)}</Text>

        </LinearGradient>

        {/* Budget Progress Section */}
        {budget > 0 && (
          <View style={styles.budgetCard}>
            <View style={styles.budgetHeader}>
              <Text style={styles.budgetTitle}>Bütçe Limitim</Text>
              <Text style={[styles.budgetTotal, budgetOver && { color: Colors.danger }]}>
                {currency}{fmt(totalMonth)} / {currency}{fmt(budget)}
              </Text>
            </View>
            <View style={styles.progressBg}>
              <LinearGradient
                colors={(budgetOver ? Colors.dangerGradient : Colors.successGradient) as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${budgetUsed * 100}%` }]}
              />
            </View>
            <Text style={styles.progressLabel}>
              {budgetOver
                ? `${currency}${fmt(totalMonth - budget)} bütçe aşıldı`
                : `%${Math.round(budgetUsed * 100)} kullanım • ${currency}${fmt(budget - totalMonth)} kaldı`}
            </Text>
          </View>
        )}

        {/* Categories Grid View */}
        {catTotals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Harcama Dağılımı</Text>
            <View style={styles.catGrid}>
              {catTotals.map((cat) => (
                <View key={cat.id} style={styles.catCard}>
                  <View style={[styles.catIconBox, { backgroundColor: cat.color + '20' }]}>
                    <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                  </View>
                  <View style={styles.catCardText}>
                    <Text style={styles.catCardLabel} numberOfLines={1}>{cat.name}</Text>
                    <Text style={styles.catCardValue}>{currency}{fmt(cat.total)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Activity List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Son İşlemler</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/expenses')}>
              <Text style={styles.seeAllText}>Tümü</Text>
            </TouchableOpacity>
          </View>

          {recent.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="card-outline" size={48} color={Colors.border} />
              <Text style={styles.emptyText}>Henüz bir harcama yok</Text>
            </View>
          ) : (
            recent.map((exp) => {
              const cat = categories.find(c => c.id === exp.categoryId);
              return (
                <TouchableOpacity
                  key={exp.id}
                  style={styles.expCard}
                  onPress={() => router.push({ pathname: '/edit-expense', params: { id: exp.id } })}
                >
                  <View style={[styles.expIconBox, { backgroundColor: (cat?.color ?? Colors.border) + '15' }]}>
                    <Ionicons name={(cat?.icon ?? 'ellipsis-horizontal') as any} size={20} color={cat?.color ?? Colors.border} />
                  </View>
                  <View style={styles.expMain}>
                    <Text style={styles.expCatName}>{cat?.name ?? 'Diğer'}</Text>
                    <Text style={styles.expNote} numberOfLines={1}>{exp.note || 'Genel harcama'}</Text>
                  </View>
                  <View style={styles.expEnd}>
                    <Text style={styles.expValue}>{currency}{fmt(exp.convertedAmount ?? exp.amount)}</Text>
                    {exp.currency !== currency && (
                      <Text style={styles.expOriginalValue}>{exp.currency}{fmt(exp.amount)}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )
            })
          )}
        </View>
      </ScrollView>

      {/* Modern Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.9}
        onPress={() => router.push('/add-expense')}
      >
        <LinearGradient
          colors={Colors.primaryGradient as any}
          style={styles.fabInner}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, paddingBottom: 100 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.xl, marginTop: Spacing.sm
  },
  welcomeText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 2 },
  headerTitle: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '900', letterSpacing: -0.5 },
  notifBtn: {
    width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  heroCard: {
    padding: Spacing.md, borderRadius: Radius.xl, marginBottom: Spacing.xl,
    overflow: 'hidden', position: 'relative',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10,
  },
  heroGlow: {
    position: 'absolute', top: -40, right: -40, width: 160, height: 160,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 80,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs, fontWeight: '600' },
  heroAmount: { color: '#fff', fontSize: FontSize.xxl, fontWeight: '900', letterSpacing: -1 },
  heroBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)'
  },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroStatText: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.sm, fontWeight: '700' },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.full },
  heroBadgeText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '800' },

  budgetCard: {
    backgroundColor: Colors.surface, padding: Spacing.lg, borderRadius: Radius.xl,
    marginBottom: Spacing.xl, borderWidth: 1, borderColor: Colors.border,
  },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  budgetTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '800' },
  budgetTotal: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '700' },
  progressBg: { height: 12, backgroundColor: Colors.surfaceAlt, borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: '100%', borderRadius: 6 },
  progressLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600' },

  section: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '900', letterSpacing: 0.5 },
  seeAllText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '700' },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  catCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, padding: Spacing.sm, borderRadius: Radius.lg,
    width: '48%', borderWidth: 1, borderColor: Colors.border,
  },
  catIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catCardText: { flex: 1 },
  catCardLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700', marginBottom: 2 },
  catCardValue: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '800' },

  expCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    padding: Spacing.md, borderRadius: Radius.lg, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  expIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  expDot: { width: 12, height: 12, borderRadius: 6 },
  expMain: { flex: 1 },
  expCatName: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700' },
  expNote: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2, fontWeight: '500' },
  expEnd: { alignItems: 'flex-end' },
  expValue: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '800' },
  expOriginalValue: { color: Colors.textSecondary, fontSize: 10, marginTop: 2, fontWeight: '600' },

  emptyContainer: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },

  monthCompRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 6,
  },
  monthCompText: { fontSize: FontSize.xs, fontWeight: '700' },

  fab: {
    position: 'absolute', bottom: 30, right: 30, width: 64, height: 64, borderRadius: 32,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 12,
  },
  fabInner: { flex: 1, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});

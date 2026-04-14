import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

  const currentMonth = format(new Date(), 'yyyy-MM');

  const monthExpenses = expenses.filter((e) => e.date.startsWith(currentMonth));
  const totalMonth = monthExpenses.reduce((s, e) => s + e.amount, 0);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayExpenses = expenses.filter((e) => e.date === todayStr);
  const totalToday = todayExpenses.reduce((s, e) => s + e.amount, 0);

  // Category totals
  const catTotals = categories.map((cat) => ({
    cat,
    total: monthExpenses
      .filter((e) => e.categoryId === cat.id)
      .reduce((s, e) => s + e.amount, 0),
  })).filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total);

  const recent = expenses.slice(0, 5);

  const budgetUsed = budget > 0 ? Math.min(totalMonth / budget, 1) : 0;
  const budgetOver = budget > 0 && totalMonth > budget;

  function fmt(n: number) {
    return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function getCatById(id: string) {
    return categories.find((c) => c.id === id);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Merhaba!</Text>
            <Text style={styles.monthLabel}>
              {format(new Date(), 'MMMM yyyy', { locale: tr })}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/add-expense')}
          >
            <Ionicons name="add" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Monthly Total Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Bu Ay Toplam</Text>
          <Text style={styles.totalAmount}>
            {currency}{fmt(totalMonth)}
          </Text>

          {budget > 0 && (
            <View style={styles.budgetSection}>
              <View style={styles.budgetBarBg}>
                <View
                  style={[
                    styles.budgetBarFill,
                    {
                      width: `${budgetUsed * 100}%` as any,
                      backgroundColor: budgetOver ? Colors.danger : Colors.success,
                    },
                  ]}
                />
              </View>
              <View style={styles.budgetLabels}>
                <Text style={styles.budgetUsed}>
                  {currency}{fmt(totalMonth)} harcandı
                </Text>
                <Text style={[styles.budgetRemain, { color: budgetOver ? Colors.danger : Colors.success }]}>
                  {budgetOver
                    ? `${currency}${fmt(totalMonth - budget)} aşıldı`
                    : `${currency}${fmt(budget - totalMonth)} kaldı`}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Today Card */}
        <View style={styles.todayCard}>
          <View>
            <Text style={styles.todayLabel}>Bugün</Text>
            <Text style={styles.todayAmount}>{currency}{fmt(totalToday)}</Text>
          </View>
          <View style={styles.todayCountBadge}>
            <Text style={styles.todayCount}>{todayExpenses.length} işlem</Text>
          </View>
        </View>

        {/* Category Breakdown */}
        {catTotals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kategoriler</Text>
            {catTotals.map(({ cat, total }) => {
              const pct = totalMonth > 0 ? total / totalMonth : 0;
              return (
                <View key={cat.id} style={styles.catRow}>
                  <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                  <View style={styles.catInfo}>
                    <View style={styles.catRowTop}>
                      <Text style={styles.catName}>{cat.name}</Text>
                      <Text style={styles.catAmount}>{currency}{fmt(total)}</Text>
                    </View>
                    <View style={styles.catBarBg}>
                      <View
                        style={[
                          styles.catBarFill,
                          { width: `${pct * 100}%` as any, backgroundColor: cat.color },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Recent Expenses */}
        {recent.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Son Harcamalar</Text>
              <TouchableOpacity onPress={() => router.push('/expenses' as any)}>
                <Text style={styles.seeAll}>Tümünü Gör</Text>
              </TouchableOpacity>
            </View>
            {recent.map((exp) => {
              const cat = getCatById(exp.categoryId);
              return (
                <TouchableOpacity
                  key={exp.id}
                  style={styles.expRow}
                  onPress={() => router.push({ pathname: '/edit-expense', params: { id: exp.id } })}
                >
                  <View style={[styles.expIcon, { backgroundColor: `${cat?.color ?? Colors.border}22` }]}>
                    <View style={[styles.expDot, { backgroundColor: cat?.color ?? Colors.border }]} />
                  </View>
                  <View style={styles.expInfo}>
                    <Text style={styles.expCat}>{cat?.name ?? 'Diğer'}</Text>
                    {exp.note ? <Text style={styles.expNote} numberOfLines={1}>{exp.note}</Text> : null}
                  </View>
                  <View style={styles.expRight}>
                    <Text style={styles.expAmount}>{currency}{fmt(exp.amount)}</Text>
                    <Text style={styles.expDate}>
                      {exp.date === todayStr ? 'Bugün' : format(new Date(exp.date), 'd MMM', { locale: tr })}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {expenses.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={56} color={Colors.border} />
            <Text style={styles.emptyTitle}>Henüz harcama yok</Text>
            <Text style={styles.emptyDesc}>İlk harcamanı eklemek için + butonuna dokun</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, paddingBottom: 32 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md,
  },
  greeting: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '500' },
  monthLabel: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700', textTransform: 'capitalize' },
  addBtn: {
    width: 46, height: 46, borderRadius: Radius.full,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  totalCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg,
    marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  totalLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '500', marginBottom: 4 },
  totalAmount: { color: Colors.textPrimary, fontSize: FontSize.xxxl, fontWeight: '800' },
  budgetSection: { marginTop: Spacing.md },
  budgetBarBg: { height: 6, backgroundColor: Colors.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  budgetBarFill: { height: '100%', borderRadius: 3 },
  budgetLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  budgetUsed: { color: Colors.textSecondary, fontSize: FontSize.xs },
  budgetRemain: { fontSize: FontSize.xs, fontWeight: '600' },
  todayCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primaryMuted, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '40',
  },
  todayLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '500', marginBottom: 2 },
  todayAmount: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  todayCountBadge: {
    backgroundColor: Colors.primary + '30', paddingHorizontal: Spacing.sm,
    paddingVertical: 4, borderRadius: Radius.full,
  },
  todayCount: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600' },
  section: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm },
  seeAll: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm, gap: Spacing.sm },
  catDot: { width: 10, height: 10, borderRadius: 5, marginTop: 2 },
  catInfo: { flex: 1 },
  catRowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catName: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '500' },
  catAmount: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '700' },
  catBarBg: { height: 4, backgroundColor: Colors.surfaceAlt, borderRadius: 2, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 2 },
  expRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm,
  },
  expIcon: { width: 38, height: 38, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  expDot: { width: 10, height: 10, borderRadius: 5 },
  expInfo: { flex: 1 },
  expCat: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '600' },
  expNote: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 1 },
  expRight: { alignItems: 'flex-end' },
  expAmount: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '700' },
  expDate: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 1 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  emptyDesc: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center' },
});

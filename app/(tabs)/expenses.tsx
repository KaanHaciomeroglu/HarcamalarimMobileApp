import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  SectionList,
} from 'react-native';
import { useState, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';
import { getExpenses, getSettings, Expense } from '../../store/storage';
import { Category } from '../../constants/categories';

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currency, setCurrency] = useState('₺');
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [exps, settings] = await Promise.all([getExpenses(), getSettings()]);
    setExpenses(exps);
    setCategories(settings.categories);
    setCurrency(settings.currency);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  function fmt(n: number) {
    return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function getCat(id: string) {
    return categories.find((c) => c.id === id);
  }

  const filtered = filterCat ? expenses.filter((e) => e.categoryId === filterCat) : expenses;

  // Group by date
  const grouped: Record<string, Expense[]> = {};
  for (const exp of filtered) {
    if (!grouped[exp.date]) grouped[exp.date] = [];
    grouped[exp.date].push(exp);
  }
  const sections = Object.entries(grouped)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, data]) => ({ title: date, data }));

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const yesterdayStr = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');

  function sectionTitle(date: string) {
    if (date === todayStr) return 'Bugün';
    if (date === yesterdayStr) return 'Dün';
    return format(new Date(date), 'd MMMM yyyy, EEEE', { locale: tr });
  }

  function sectionTotal(data: Expense[]) {
    return data.reduce((s, e) => s + e.amount, 0);
  }

  // Active categories for filter
  const activeCatIds = [...new Set(expenses.map((e) => e.categoryId))];
  const filterCats = categories.filter((c) => activeCatIds.includes(c.id));

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Harcamalar</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/add-expense')}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      {filterCats.length > 0 && (
        <View>
          <FlatList
            data={[{ id: null, name: 'Tümü', color: Colors.primary } as any, ...filterCats]}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
            keyExtractor={(item) => item.id ?? '__all'}
            renderItem={({ item }) => {
              const active = filterCat === item.id;
              return (
                <TouchableOpacity
                  onPress={() => setFilterCat(item.id)}
                  style={[
                    styles.filterChip,
                    active && { backgroundColor: `${item.color}33`, borderColor: item.color },
                  ]}
                >
                  <Text style={[styles.filterChipText, active && { color: item.color }]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {sections.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={56} color={Colors.border} />
          <Text style={styles.emptyTitle}>Harcama bulunamadı</Text>
          <Text style={styles.emptyDesc}>
            {filterCat ? 'Bu kategoride harcama yok.' : 'Henüz hiç harcama eklenmemiş.'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionDate}>{sectionTitle(section.title)}</Text>
              <Text style={styles.sectionTotal}>
                {currency}{fmt(sectionTotal(section.data))}
              </Text>
            </View>
          )}
          renderItem={({ item: exp }) => {
            const cat = getCat(exp.categoryId);
            return (
              <TouchableOpacity
                style={styles.expRow}
                onPress={() => router.push({ pathname: '/edit-expense', params: { id: exp.id } })}
              >
                <View style={[styles.expIcon, { backgroundColor: `${cat?.color ?? Colors.border}22` }]}>
                  <View style={[styles.expDot, { backgroundColor: cat?.color ?? Colors.border }]} />
                </View>
                <View style={styles.expInfo}>
                  <Text style={styles.expCat}>{cat?.name ?? 'Diğer'}</Text>
                  {exp.note ? (
                    <Text style={styles.expNote} numberOfLines={1}>{exp.note}</Text>
                  ) : null}
                </View>
                <View style={styles.expRight}>
                  <Text style={styles.expAmount}>{currency}{fmt(exp.amount)}</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.textSecondary} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.sm,
  },
  title: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '800' },
  addBtn: {
    width: 38, height: 38, borderRadius: Radius.full,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  filterList: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.xs },
  filterChip: {
    paddingHorizontal: Spacing.sm + 2, paddingVertical: Spacing.xs,
    borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterChipText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600' },
  listContent: { paddingHorizontal: Spacing.md, paddingBottom: 32 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.xs + 2, marginTop: Spacing.sm,
  },
  sectionDate: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
  sectionTotal: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700' },
  expRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.xs + 2, gap: Spacing.sm,
  },
  expIcon: { width: 40, height: 40, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  expDot: { width: 10, height: 10, borderRadius: 5 },
  expInfo: { flex: 1 },
  expCat: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '600' },
  expNote: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  expRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expAmount: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  emptyTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  emptyDesc: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center' },
});

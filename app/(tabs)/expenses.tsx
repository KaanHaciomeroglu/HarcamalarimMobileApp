import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  SectionList,
  StatusBar,
  FlatList,
} from 'react-native';
import { useState, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
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
    return n.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
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
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

  function sectionTitle(date: string) {
    if (date === todayStr) return 'Bugün';
    if (date === yesterdayStr) return 'Dün';
    return format(new Date(date), 'd MMMM yyyy, EEEE', { locale: tr });
  }

  function sectionTotal(data: Expense[]) {
    return data.reduce((s, e) => s + (e.convertedAmount ?? e.amount), 0);
  }

  const activeCatIds = [...new Set(expenses.map((e) => e.categoryId))];
  const filterCats = categories.filter((c) => activeCatIds.includes(c.id));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Harcama Geçmişi</Text>
        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => router.push('/add-expense')}
        >
          <LinearGradient
            colors={Colors.primaryGradient as any}
            style={styles.addBtnInner}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Modern Filter List */}
      <View style={styles.filterSection}>
        <FlatList
          data={[{ id: null, name: 'Hepsi', color: Colors.primary } as any, ...filterCats]}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          keyExtractor={(item) => item.id ?? 'all'}
          renderItem={({ item }) => {
            const active = filterCat === item.id;
            return (
              <TouchableOpacity
                onPress={() => setFilterCat(item.id)}
                style={[
                  styles.filterChip,
                  active && { backgroundColor: item.color + '25', borderColor: item.color },
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

      {sections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color={Colors.border} />
          <Text style={styles.emptyTitle}>Harcama Bulunamadı</Text>
          <Text style={styles.emptyDesc}>Seçili kriterlere uygun işlem bulunmuyor.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionDate}>{sectionTitle(section.title)}</Text>
              <Text style={styles.sectionTotal}>
                {currency}{fmt(sectionTotal(section.data))}
              </Text>
            </View>
          )}
          renderItem={({ item: exp }) => {
            const cat = categories.find(c => c.id === exp.categoryId);
            const hasConversion = exp.currency && exp.currency !== currency;
            return (
              <TouchableOpacity
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
                  {hasConversion && (
                    <Text style={styles.expOriginalValue}>{exp.currency}{fmt(exp.amount)}</Text>
                  )}
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.lg
  },
  headerTitle: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '900' },
  addBtn: { width: 44, height: 44, borderRadius: 22 },
  addBtnInner: { flex: 1, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  filterSection: { marginBottom: Spacing.md },
  filterList: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  filterChip: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterChipText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '700' },

  listContent: { paddingHorizontal: Spacing.md, paddingBottom: 40 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, marginTop: Spacing.lg,
  },
  sectionDate: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  sectionTotal: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '900' },

  expCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    padding: Spacing.md, borderRadius: Radius.xl, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  expIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  expDot: { width: 12, height: 12, borderRadius: 6 },
  expMain: { flex: 1 },
  expCatName: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700' },
  expNote: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2, fontWeight: '600' },
  expEnd: { alignItems: 'flex-end' },
  expValue: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '800' },
  expOriginalValue: { color: Colors.textSecondary, fontSize: 10, marginTop: 2, fontWeight: '600' },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 100, gap: 16 },
  emptyTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '900' },
  emptyDesc: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '500', textAlign: 'center' },
});

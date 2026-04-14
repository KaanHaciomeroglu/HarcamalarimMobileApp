import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, subMonths, addMonths, getDaysInMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';
import { getExpenses, getSettings, Expense } from '../../store/storage';
import { Category } from '../../constants/categories';
import { getMonthlyAnalysis } from '../../services/ai';

export default function MonthlyScreen() {
  const [baseDate, setBaseDate] = useState(new Date());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currency, setCurrency] = useState('₺');
  const [refreshing, setRefreshing] = useState(false);

  // AI analiz state'leri
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const aiTextRef = useRef('');

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

  const monthStr = format(baseDate, 'yyyy-MM');
  const prevMonthStr = format(subMonths(baseDate, 1), 'yyyy-MM');

  const monthExps = expenses.filter((e) => e.date.startsWith(monthStr));
  const prevMonthExps = expenses.filter((e) => e.date.startsWith(prevMonthStr));

  const total = monthExps.reduce((s, e) => s + e.amount, 0);
  const prevTotal = prevMonthExps.reduce((s, e) => s + e.amount, 0);

  const diff = total - prevTotal;
  const isUp = diff > 0;

  function fmt(n: number) {
    return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function getCat(id: string) {
    return categories.find((c) => c.id === id);
  }

  // Category breakdown
  const catBreakdown = categories
    .map((cat) => ({
      cat,
      total: monthExps.filter((e) => e.categoryId === cat.id).reduce((s, e) => s + e.amount, 0),
    }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total);

  // Daily bar chart data
  const daysInMonth = getDaysInMonth(baseDate);
  const dailyTotals: number[] = Array(daysInMonth).fill(0);
  for (const exp of monthExps) {
    const day = parseInt(exp.date.split('-')[2], 10) - 1;
    if (day >= 0 && day < daysInMonth) {
      dailyTotals[day] += exp.amount;
    }
  }
  const maxDaily = Math.max(...dailyTotals, 1);

  const isCurrentMonth = monthStr === format(new Date(), 'yyyy-MM');

  const dailyAverage = monthExps.length > 0 ? total / getDaysInMonth(baseDate) : 0;

  async function fetchAiAnalysis() {
    setShowAiPanel(true);
    setAiLoading(true);
    setAiText('');
    aiTextRef.current = '';

    const [allExps, settings] = await Promise.all([getExpenses(), getSettings()]);

    const catBreakdownForAi = categories
      .map((cat) => ({
        name: cat.name,
        total: monthExps.filter((e) => e.categoryId === cat.id).reduce((s, e) => s + e.amount, 0),
        pct: total > 0 ? Math.round((monthExps.filter((e) => e.categoryId === cat.id).reduce((s, e) => s + e.amount, 0) / total) * 100) : 0,
      }))
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total);

    await getMonthlyAnalysis(
      {
        month: monthStr,
        total,
        prevTotal,
        budget: settings.monthlyBudget,
        currency,
        categoryBreakdown: catBreakdownForAi,
        dailyAverage,
        expenseCount: monthExps.length,
      },
      (chunk) => {
        aiTextRef.current += chunk;
        setAiText(aiTextRef.current);
      },
      () => setAiLoading(false),
      () => {
        setAiLoading(false);
        setAiText(aiTextRef.current || 'AI analizi alınamadı. API anahtarını kontrol edin.');
      }
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Month Selector */}
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => setBaseDate((d) => subMonths(d, 1))} style={styles.monthArrow}>
            <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {format(baseDate, 'MMMM yyyy', { locale: tr })}
          </Text>
          <TouchableOpacity
            onPress={() => setBaseDate((d) => addMonths(d, 1))}
            disabled={isCurrentMonth}
            style={styles.monthArrow}
          >
            <Ionicons
              name="chevron-forward"
              size={22}
              color={isCurrentMonth ? Colors.border : Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Total + Comparison */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Toplam Harcama</Text>
          <Text style={styles.totalAmount}>{currency}{fmt(total)}</Text>
          {prevTotal > 0 && (
            <View style={styles.compareRow}>
              <Ionicons
                name={isUp ? 'trending-up' : 'trending-down'}
                size={14}
                color={isUp ? Colors.danger : Colors.success}
              />
              <Text style={[styles.compareText, { color: isUp ? Colors.danger : Colors.success }]}>
                {isUp ? '+' : ''}{currency}{fmt(Math.abs(diff))} geçen aya göre
              </Text>
            </View>
          )}
        </View>

        {/* AI Analiz Butonu */}
        {monthExps.length > 0 && (
          <TouchableOpacity
            style={styles.aiBtn}
            onPress={fetchAiAnalysis}
            disabled={aiLoading}
          >
            <Ionicons name="sparkles" size={16} color={Colors.primary} />
            <Text style={styles.aiBtnText}>
              {aiLoading ? 'Analiz yapılıyor...' : 'AI ile Analiz Et'}
            </Text>
            {aiLoading && <ActivityIndicator size="small" color={Colors.primary} />}
          </TouchableOpacity>
        )}

        {/* AI Analiz Paneli */}
        {showAiPanel && (
          <View style={styles.aiPanel}>
            <View style={styles.aiPanelHeader}>
              <View style={styles.aiIconWrapper}>
                <Ionicons name="sparkles" size={16} color={Colors.primary} />
              </View>
              <Text style={styles.aiPanelTitle}>Aylık Analiz</Text>
              {!aiLoading && (
                <TouchableOpacity onPress={() => setShowAiPanel(false)} style={styles.aiCloseBtn}>
                  <Ionicons name="close" size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            {aiLoading && aiText === '' ? (
              <View style={styles.aiLoadingRow}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.aiLoadingText}>Analiz yazılıyor...</Text>
              </View>
            ) : (
              <Text style={styles.aiText}>
                {aiText}
                {aiLoading && <Text style={{ color: Colors.primary }}>▌</Text>}
              </Text>
            )}
          </View>
        )}

        {/* Daily Bar Chart */}
        {monthExps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Günlük Dağılım</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.barChart}>
                {dailyTotals.map((val, idx) => {
                  const pct = val / maxDaily;
                  const hasVal = val > 0;
                  return (
                    <View key={idx} style={styles.barCol}>
                      <View style={styles.barWrapper}>
                        {hasVal && (
                          <View
                            style={[
                              styles.bar,
                              { height: Math.max(4, pct * 90), backgroundColor: Colors.primary },
                            ]}
                          />
                        )}
                      </View>
                      <Text style={styles.barLabel}>{idx + 1}</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Category Breakdown */}
        {catBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kategoriye Göre</Text>
            {catBreakdown.map(({ cat, total: catTotal }) => {
              const pct = total > 0 ? catTotal / total : 0;
              const prevCatTotal = prevMonthExps
                .filter((e) => e.categoryId === cat.id)
                .reduce((s, e) => s + e.amount, 0);
              const catDiff = catTotal - prevCatTotal;

              return (
                <View key={cat.id} style={styles.catRow}>
                  <View style={styles.catLeft}>
                    <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                    <View style={styles.catInfo}>
                      <View style={styles.catTop}>
                        <Text style={styles.catName}>{cat.name}</Text>
                        <Text style={styles.catAmount}>{currency}{fmt(catTotal)}</Text>
                      </View>
                      <View style={styles.catBarBg}>
                        <View style={[styles.catBarFill, { width: `${pct * 100}%` as any, backgroundColor: cat.color }]} />
                      </View>
                      <View style={styles.catMeta}>
                        <Text style={styles.catPct}>{(pct * 100).toFixed(1)}% toplam</Text>
                        {prevCatTotal > 0 && (
                          <Text style={[styles.catDiff, { color: catDiff > 0 ? Colors.danger : Colors.success }]}>
                            {catDiff > 0 ? '▲' : '▼'} {currency}{fmt(Math.abs(catDiff))}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {monthExps.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={56} color={Colors.border} />
            <Text style={styles.emptyTitle}>Bu ay harcama yok</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, paddingBottom: 32 },
  monthSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  monthArrow: { padding: Spacing.xs + 2 },
  monthLabel: {
    color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '800', textTransform: 'capitalize',
  },
  totalCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  totalLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: 4 },
  totalAmount: { color: Colors.textPrimary, fontSize: FontSize.xxxl, fontWeight: '800' },
  compareRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs, gap: 4 },
  compareText: { fontSize: FontSize.xs, fontWeight: '600' },
  section: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.md },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingBottom: 4 },
  barCol: { alignItems: 'center', width: 20 },
  barWrapper: { height: 90, justifyContent: 'flex-end' },
  bar: { width: 12, borderRadius: 3 },
  barLabel: { color: Colors.textSecondary, fontSize: 9, marginTop: 3 },
  catRow: { marginBottom: Spacing.md },
  catLeft: { flexDirection: 'row', gap: Spacing.sm },
  catDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  catInfo: { flex: 1 },
  catTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catName: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '600' },
  catAmount: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '700' },
  catBarBg: { height: 4, backgroundColor: Colors.surfaceAlt, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  catBarFill: { height: '100%', borderRadius: 2 },
  catMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  catPct: { color: Colors.textSecondary, fontSize: FontSize.xs },
  catDiff: { fontSize: FontSize.xs, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyTitle: { color: Colors.textSecondary, fontSize: FontSize.md },

  // AI
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1.5, borderColor: Colors.primary + '60',
  },
  aiBtnText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '700', flex: 1 },
  aiPanel: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  aiPanelHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md,
  },
  aiIconWrapper: {
    width: 30, height: 30, borderRadius: Radius.full,
    backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center',
  },
  aiPanelTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700', flex: 1 },
  aiCloseBtn: { padding: 4 },
  aiLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  aiLoadingText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  aiText: { color: Colors.textPrimary, fontSize: FontSize.sm, lineHeight: 22 },
});

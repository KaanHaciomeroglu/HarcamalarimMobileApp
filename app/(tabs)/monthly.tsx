import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';
import { getExpenses, getSettings, Expense } from '../../store/storage';
import { Category } from '../../constants/categories';
import { generateInsights, Insight } from '../../services/insights';

export default function MonthlyScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currency, setCurrency] = useState('₺');
  const [insights, setInsights] = useState<Insight[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const chartScrollRef = useRef<ScrollView>(null);

  // Bar genişliği + gap (styles ile aynı olmalı)
  const BAR_COL_W = 22;
  const BAR_GAP = 5;

  const chartContainerWidth = useRef(0);

  function scrollToToday() {
    const today = new Date().getDate();
    const x = (today - 1) * (BAR_COL_W + BAR_GAP) - chartContainerWidth.current / 2 + BAR_COL_W / 2;
    chartScrollRef.current?.scrollTo({ x: Math.max(0, x), animated: false });
  }

  const load = useCallback(async () => {
    const [exps, settings] = await Promise.all([getExpenses(), getSettings()]);
    setExpenses(exps);
    setCategories(settings.categories);
    setCurrency(settings.currency);
    setInsights(generateInsights(exps, settings.categories, settings.currency));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthExps = expenses.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const prevMonthExps = expenses.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  });

  const total = monthExps.reduce((s, e) => s + (e.convertedAmount ?? e.amount), 0);
  const prevTotal = prevMonthExps.reduce((s, e) => s + (e.convertedAmount ?? e.amount), 0);
  const diff = total - prevTotal;
  const diffPct = prevTotal > 0 ? (diff / prevTotal) * 100 : 0;

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
    const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
    return monthExps.filter((e) => e.date === dayStr).reduce((s, e) => s + (e.convertedAmount ?? e.amount), 0);
  });
  const maxDay = Math.max(...dailyData, 1);

  function fmt(n: number) {
    return n.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
  }

  const monthLabel = format(new Date(currentYear, currentMonth, 1), 'MMMM yyyy', { locale: tr });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <Text style={styles.headerTitle}>Aylık Analiz</Text>

        {/* Hero Total Card */}
        <LinearGradient
          colors={Colors.primaryGradient as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.totalCard}
        >
          <View style={styles.heroGlow} />
          <Text style={styles.totalLabel}>{monthLabel} · Toplam Harcama</Text>
          <Text style={styles.totalAmount}>{currency}{fmt(total)}</Text>

          {prevTotal > 0 && (
            <View style={styles.compareBox}>
              <View style={[styles.diffBadge, { backgroundColor: diff > 0 ? 'rgba(255,75,110,0.2)' : 'rgba(0,242,148,0.2)' }]}>
                <Ionicons
                  name={diff > 0 ? 'trending-up' : 'trending-down'}
                  size={16}
                  color={diff > 0 ? Colors.danger : Colors.success}
                />
                <Text style={[styles.diffText, { color: diff > 0 ? Colors.danger : Colors.success }]}>
                  {diff > 0 ? '+' : ''}{diffPct.toFixed(1)}%
                </Text>
              </View>
              <Text style={styles.compareLabel}>Geçen aya göre</Text>
            </View>
          )}
        </LinearGradient>

        {/* Daily Spending Chart */}
        <View style={[styles.section, { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md }]}>
          <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Günlük Harcama Dağılımı</Text>
          <ScrollView
            ref={chartScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chartScroll}
            onLayout={(e) => { chartContainerWidth.current = e.nativeEvent.layout.width; }}
            onContentSizeChange={() => scrollToToday()}
          >
            <View style={styles.chartContainer}>
              {selectedDay !== null && dailyData[selectedDay] > 0 && (
                <View style={[styles.tooltip, { left: selectedDay * (22 + 5) - 20 }]}>
                  <Text style={styles.tooltipText} numberOfLines={1}>
                    {currency}{fmt(dailyData[selectedDay])}
                  </Text>
                </View>
              )}
              {dailyData.map((val, i) => {
                const BAR_MAX_H = 110;
                const BAR_MIN_H = 4;
                const barH = val > 0 ? Math.max(BAR_MIN_H + (val / maxDay) * (BAR_MAX_H - BAR_MIN_H), BAR_MIN_H) : BAR_MIN_H;
                const isSelected = selectedDay === i;
                const isToday = i + 1 === now.getDate();
                return (
                  <TouchableOpacity
                    key={i}
                    style={styles.barCol}
                    activeOpacity={0.7}
                    onPress={() => setSelectedDay(isSelected ? null : i)}
                  >
                    <View style={styles.barTrack}>
                      {val > 0 ? (
                        <LinearGradient
                          colors={isSelected ? ['#fff', Colors.primary] as any : Colors.primaryGradient as any}
                          style={[styles.barFill, { height: barH }]}
                        />
                      ) : (
                        <View style={[styles.barFill, { height: BAR_MIN_H, backgroundColor: Colors.border }]} />
                      )}
                    </View>
                    <Text style={[styles.barLabel, isToday && { color: Colors.primary, fontWeight: '900' }]}>{i + 1}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Insights */}
        {insights.length > 0 && (
          <View style={styles.insightsSection}>
            <View style={styles.insightsHeader}>
              <Ionicons name="bulb-outline" size={18} color={Colors.primary} />
              <Text style={styles.insightsTitle}>Bu Ayki Çıkarımlar</Text>
            </View>
            {insights.map((ins, i) => (
              <View key={i} style={[styles.insightRow, { borderLeftColor: ins.color }]}>
                <Ionicons name={ins.icon as any} size={18} color={ins.color} style={styles.insightIcon} />
                <View style={styles.insightText}>
                  <Text style={[styles.insightTitle, { color: ins.color }]}>{ins.title}</Text>
                  <Text style={styles.insightBody}>{ins.text}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Category Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kategori Detayları</Text>
          {categories.map((cat) => {
            const catTotal = monthExps
              .filter((e) => e.categoryId === cat.id)
              .reduce((s, e) => s + (e.convertedAmount ?? e.amount), 0);
            if (catTotal === 0) return null;

            const pct = (catTotal / total) * 100;
            const prevCatTotal = prevMonthExps
              .filter((e) => e.categoryId === cat.id)
              .reduce((s, e) => s + (e.convertedAmount ?? e.amount), 0);
            const catDiff = catTotal - prevCatTotal;

            return (
              <View key={cat.id} style={styles.catRow}>
                <View style={[styles.catIconBox, { backgroundColor: cat.color + '15' }]}>
                  <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                </View>
                <View style={styles.catRight}>
                  <View style={styles.catTopRow}>
                    <Text style={styles.catName}>{cat.name}</Text>
                    <Text style={styles.catValue}>{currency}{fmt(catTotal)}</Text>
                  </View>
                  <View style={styles.catProgressBg}>
                    <View style={[styles.catProgressFill, { width: `${pct}%`, backgroundColor: cat.color }]} />
                  </View>
                  <View style={styles.catFooter}>
                    <Text style={styles.catPct}>%{Math.round(pct)} Pay</Text>
                    {catDiff !== 0 && (
                      <View style={styles.catDiffRow}>
                        <Ionicons
                          name={catDiff > 0 ? 'trending-up' : 'trending-down'}
                          size={12}
                          color={catDiff > 0 ? Colors.danger : Colors.success}
                        />
                        <Text style={[styles.catDiff, { color: catDiff > 0 ? Colors.danger : Colors.success }]}>
                          {catDiff > 0 ? '+' : '-'}{currency}{fmt(Math.abs(catDiff))}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, paddingBottom: 40 },
  headerTitle: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '900', marginBottom: Spacing.xl },

  totalCard: {
    padding: Spacing.xl, borderRadius: Radius.xl, marginBottom: Spacing.xl,
    overflow: 'hidden', position: 'relative',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 12,
  },
  heroGlow: {
    position: 'absolute', top: -50, left: -50, width: 180, height: 180,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 90,
  },
  totalLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm, fontWeight: '600', marginBottom: 8 },
  totalAmount: { color: '#fff', fontSize: FontSize.xxxl, fontWeight: '900', letterSpacing: -1 },
  compareBox: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.lg, gap: 10 },
  diffBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.md },
  diffText: { fontSize: FontSize.sm, fontWeight: '800' },
  compareLabel: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.xs, fontWeight: '600' },

  section: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg,
    marginBottom: Spacing.xl, borderWidth: 1, borderColor: Colors.border,
  },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.xl },
  chartScroll: { marginHorizontal: -Spacing.md, paddingHorizontal: Spacing.md },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 150, paddingTop: 20 },
  barCol: { width: 22, alignItems: 'center' },
  barTrack: { width: 14, backgroundColor: Colors.surfaceAlt, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 6 },
  barLabel: { color: Colors.textSecondary, fontSize: 9, marginTop: 5, fontWeight: '700' },
  tooltip: {
    position: 'absolute', top: 0, backgroundColor: Colors.primary,
    borderRadius: Radius.md, paddingHorizontal: 8, paddingVertical: 3,
    zIndex: 10,
  },
  tooltipText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  insightsSection: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg,
    marginBottom: Spacing.xl, borderWidth: 1, borderColor: Colors.border,
  },
  insightsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.lg },
  insightsTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '800' },
  insightRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderLeftWidth: 3, paddingLeft: 12, marginBottom: Spacing.lg,
  },
  insightIcon: { marginTop: 1 },
  insightText: { flex: 1 },
  insightTitle: { fontSize: FontSize.sm, fontWeight: '800', marginBottom: 3 },
  insightBody: { color: Colors.textSecondary, fontSize: FontSize.xs, lineHeight: 18, fontWeight: '500' },

  catRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  catIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catRight: { flex: 1 },
  catTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catName: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700' },
  catValue: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '800' },
  catProgressBg: { height: 8, backgroundColor: Colors.surfaceAlt, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  catProgressFill: { height: '100%', borderRadius: 4 },
  catFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  catPct: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700' },
  catDiffRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  catDiff: { fontSize: FontSize.xs, fontWeight: '800' },
});

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';
import { addExpense, updateExpense, getExpenses, getSettings } from '../store/storage';
import { Category } from '../constants/categories';
import { getExpenseComment } from '../services/ai';

export default function AddExpenseScreen() {
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('yemek');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);

  // AI yorum state'leri
  const [aiComment, setAiComment] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const aiTextRef = useRef('');
  const savedExpenseId = useRef('');

  useEffect(() => {
    getSettings().then((s) => setCategories(s.categories));
  }, []);

  async function handleSave() {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(parsed) || parsed <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar girin.');
      return;
    }
    setSaving(true);

    const saved = await addExpense({
      amount: parsed,
      categoryId: selectedCategory,
      date,
      note: note.trim(),
    });

    savedExpenseId.current = saved.id;
    setSaving(false);
    fetchAiComment(parsed);
  }

  async function fetchAiComment(parsed: number) {
    setShowAiPanel(true);
    setAiLoading(true);
    setAiComment('');
    aiTextRef.current = '';

    try {
      const [allExpenses, settings] = await Promise.all([
        getExpenses(),
        getSettings(),
      ]);

      const currentMonth = format(new Date(), 'yyyy-MM');
      const monthExp = allExpenses.filter((e) => e.date.startsWith(currentMonth));
      const monthTotal = monthExp.reduce((s, e) => s + e.amount, 0);
      const catMonthTotal = monthExp
        .filter((e) => e.categoryId === selectedCategory)
        .reduce((s, e) => s + e.amount, 0);

      const cat = settings.categories.find((c) => c.id === selectedCategory);

      await getExpenseComment(
        {
          amount: parsed,
          categoryName: cat?.name ?? 'Diğer',
          note: note.trim(),
          date,
          monthTotal,
          monthlyBudget: settings.monthlyBudget,
          currency: settings.currency,
          categoryMonthTotal: catMonthTotal,
        },
        (chunk) => {
          aiTextRef.current += chunk;
          setAiComment(aiTextRef.current);
        },
        async () => {
          setAiLoading(false);
          // AI yorumunu harcamayla birlikte kaydet
          if (savedExpenseId.current && aiTextRef.current) {
            await updateExpense(savedExpenseId.current, {
              aiComment: aiTextRef.current,
            });
          }
        },
        (err) => {
          setAiLoading(false);
          setAiComment('Hata: ' + err);
        }
      );
    } catch (e: any) {
      setAiLoading(false);
      setAiComment('Hata: ' + (e?.message ?? String(e)));
    }
  }

  function handleClose() {
    router.back();
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');

  function dateLabel(d: string) {
    if (d === today) return 'Bugün';
    if (d === yesterday) return 'Dün';
    return format(new Date(d), 'd MMM yyyy', { locale: tr });
  }

  function changeDate(offset: number) {
    const current = new Date(date);
    current.setDate(current.getDate() + offset);
    if (current > new Date()) return;
    setDate(format(current, 'yyyy-MM-dd'));
  }

  // AI yorum paneli
  if (showAiPanel) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.aiPanelContainer}>
          <View style={styles.aiPanelHeader}>
            <View style={styles.aiIconWrapper}>
              <Ionicons name="sparkles" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.aiPanelTitle}>AI Yorumu</Text>
          </View>

          <View style={styles.savedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.savedBadgeText}>Harcama kaydedildi</Text>
          </View>

          <ScrollView style={styles.aiCommentBox} contentContainerStyle={{ padding: Spacing.lg }}>
            {aiLoading && aiComment === '' ? (
              <View style={styles.aiLoadingRow}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.aiLoadingText}>Yorum yazılıyor...</Text>
              </View>
            ) : (
              <Text style={styles.aiCommentText}>
                {aiComment}
                {aiLoading && (
                  <Text style={{ color: Colors.primary }}>▌</Text>
                )}
              </Text>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.closeAfterAiBtn, aiLoading && { opacity: 0.5 }]}
            onPress={handleClose}
            disabled={aiLoading}
          >
            <Text style={styles.closeAfterAiBtnText}>
              {aiLoading ? 'Yorum bekleniyor...' : 'Tamam'}
            </Text>
          </TouchableOpacity>

          {aiLoading && (
            <TouchableOpacity style={styles.skipBtn} onPress={handleClose}>
              <Text style={styles.skipBtnText}>Yorumu beklemeden kapat</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Harcama Ekle</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, saving && { opacity: 0.5 }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Kaydet</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>₺</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0,00"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>

          <View style={styles.dateRow}>
            <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateArrow}>
              <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.dateText}>{dateLabel(date)}</Text>
            <TouchableOpacity
              onPress={() => changeDate(1)}
              style={styles.dateArrow}
              disabled={date === today}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={date === today ? Colors.border : Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>Kategori</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[
                    styles.categoryItem,
                    active && {
                      borderColor: cat.color,
                      backgroundColor: `${cat.color}22`,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: active ? cat.color : Colors.border },
                    ]}
                  />
                  <Text
                    style={[
                      styles.categoryName,
                      active && { color: cat.color },
                    ]}
                    numberOfLines={1}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Not (opsiyonel)</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Açıklama ekle..."
            placeholderTextColor={Colors.textSecondary}
            multiline
            maxLength={100}
          />

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  saveBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2, borderRadius: Radius.full,
    minWidth: 70, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  content: { padding: Spacing.md },
  amountContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  currencySymbol: { color: Colors.primary, fontSize: FontSize.xxxl, fontWeight: '700', marginRight: 4 },
  amountInput: { color: Colors.textPrimary, fontSize: FontSize.xxxl, fontWeight: '700', minWidth: 120, textAlign: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg, gap: Spacing.md },
  dateArrow: { padding: Spacing.xs },
  dateText: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600', width: 120, textAlign: 'center' },
  sectionLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  categoryItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2, borderRadius: Radius.full, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.surface, gap: 6,
  },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  categoryName: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '500' },
  noteInput: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    color: Colors.textPrimary, fontSize: FontSize.md, borderWidth: 1,
    borderColor: Colors.border, minHeight: 80, textAlignVertical: 'top',
  },

  // ── AI Yorum Paneli ──
  aiPanelContainer: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  aiPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  aiIconWrapper: {
    width: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center',
  },
  aiPanelTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '800' },
  savedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: `${Colors.success}18`, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    alignSelf: 'flex-start', marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: `${Colors.success}40`,
  },
  savedBadgeText: { color: Colors.success, fontSize: FontSize.sm, fontWeight: '600' },
  aiCommentBox: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
    maxHeight: 280,
  },
  aiLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  aiLoadingText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  aiCommentText: { color: Colors.textPrimary, fontSize: FontSize.md, lineHeight: 24 },
  closeAfterAiBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.sm,
  },
  closeAfterAiBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  skipBtn: { alignItems: 'center', padding: Spacing.sm },
  skipBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm },
});

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
} from 'react-native';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';
import { updateExpense, deleteExpense, getExpenses, getSettings } from '../store/storage';
import { Category } from '../constants/categories';

export default function EditExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('yemek');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [aiComment, setAiComment] = useState('');

  useEffect(() => {
    async function load() {
      const [expenses, settings] = await Promise.all([getExpenses(), getSettings()]);
      const exp = expenses.find((e) => e.id === id);
      if (exp) {
        setAmount(exp.amount.toString().replace('.', ','));
        setSelectedCategory(exp.categoryId);
        setNote(exp.note);
        setDate(exp.date);
        setAiComment(exp.aiComment ?? '');
      }
      setCategories(settings.categories);
    }
    load();
  }, [id]);

  async function handleSave() {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(parsed) || parsed <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar girin.');
      return;
    }
    setSaving(true);
    await updateExpense(id, {
      amount: parsed,
      categoryId: selectedCategory,
      date,
      note: note.trim(),
    });
    setSaving(false);
    router.back();
  }

  async function handleDelete() {
    Alert.alert('Harcamayı Sil', 'Bu harcamayı silmek istediğinizden emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteExpense(id);
          router.back();
        },
      },
    ]);
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

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Harcamayı Düzenle</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, saving && { opacity: 0.5 }]}
          >
            <Text style={styles.saveBtnText}>Kaydet</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
                    active && { borderColor: cat.color, backgroundColor: `${cat.color}22` },
                  ]}
                >
                  <View style={[styles.categoryDot, { backgroundColor: active ? cat.color : Colors.border }]} />
                  <Text style={[styles.categoryName, active && { color: cat.color }]} numberOfLines={1}>
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

          {/* AI Yorumu */}
          {aiComment !== '' && (
            <View style={styles.aiSection}>
              <View style={styles.aiSectionHeader}>
                <Ionicons name="sparkles" size={14} color={Colors.primary} />
                <Text style={styles.aiSectionTitle}>AI Yorumu</Text>
              </View>
              <Text style={styles.aiSectionText}>{aiComment}</Text>
            </View>
          )}

          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            <Text style={styles.deleteBtnText}>Harcamayı Sil</Text>
          </TouchableOpacity>

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
  saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2, borderRadius: Radius.full },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  content: { padding: Spacing.md },
  amountContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
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
    color: Colors.textPrimary, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border,
    minHeight: 80, textAlignVertical: 'top', marginBottom: Spacing.lg,
  },
  aiSection: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  aiSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm,
  },
  aiSectionTitle: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  aiSectionText: { color: Colors.textPrimary, fontSize: FontSize.sm, lineHeight: 22 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: Spacing.sm, gap: Spacing.xs,
    padding: Spacing.md, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.danger,
  },
  deleteBtnText: { color: Colors.danger, fontWeight: '600', fontSize: FontSize.md },
});

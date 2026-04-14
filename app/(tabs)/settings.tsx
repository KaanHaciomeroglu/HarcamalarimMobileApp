import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';
import { getSettings, saveSettings, clearAllData } from '../../store/storage';
import { Category } from '../../constants/categories';

export default function SettingsScreen() {
  const [currency, setCurrency] = useState('₺');
  const [budgetText, setBudgetText] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgetEnabled, setBudgetEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const s = await getSettings();
    setCurrency(s.currency);
    setBudgetEnabled(s.monthlyBudget > 0);
    setBudgetText(s.monthlyBudget > 0 ? s.monthlyBudget.toString() : '');
    setCategories(s.categories);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleSaveBudget() {
    setSaving(true);
    const parsed = parseFloat(budgetText.replace(',', '.'));
    await saveSettings({
      monthlyBudget: budgetEnabled && !isNaN(parsed) && parsed > 0 ? parsed : 0,
      currency,
    });
    setSaving(false);
    Alert.alert('Kaydedildi', 'Ayarlar güncellendi.');
  }

  function handleToggleBudget(val: boolean) {
    setBudgetEnabled(val);
    if (!val) setBudgetText('');
  }

  const CURRENCIES = ['₺', '$', '€', '£'];

  function handleClearData() {
    Alert.alert(
      'Tüm Verileri Sil',
      'Tüm harcamalar ve ayarlar silinecek. Bu işlem geri alınamaz!',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await load();
            Alert.alert('Silindi', 'Tüm veriler temizlendi.');
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Ayarlar</Text>

        {/* Currency */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Para Birimi</Text>
          <View style={styles.currencyRow}>
            {CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setCurrency(c)}
                style={[
                  styles.currencyBtn,
                  currency === c && { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary },
                ]}
              >
                <Text style={[styles.currencyText, currency === c && { color: Colors.primary }]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Monthly Budget */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Aylık Bütçe Hedefi</Text>
            <Switch
              value={budgetEnabled}
              onValueChange={handleToggleBudget}
              trackColor={{ false: Colors.border, true: Colors.primary + '66' }}
              thumbColor={budgetEnabled ? Colors.primary : Colors.textSecondary}
            />
          </View>
          {budgetEnabled && (
            <View style={styles.budgetInputRow}>
              <Text style={styles.budgetCurrency}>{currency}</Text>
              <TextInput
                style={styles.budgetInput}
                value={budgetText}
                onChangeText={setBudgetText}
                placeholder="0,00"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
          )}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.5 }]}
            onPress={handleSaveBudget}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>Kaydet</Text>
          </TouchableOpacity>
        </View>

        {/* Categories Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Kategoriler</Text>
          <Text style={styles.cardDesc}>
            Harcama eklerken bu kategorileri kullanabilirsin.
          </Text>
          <View style={styles.catList}>
            {categories.map((cat) => (
              <View key={cat.id} style={styles.catItem}>
                <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                <Text style={styles.catName}>{cat.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Danger Zone */}
        <View style={[styles.card, styles.dangerCard]}>
          <Text style={[styles.cardTitle, { color: Colors.danger }]}>Tehlikeli Bölge</Text>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleClearData}>
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            <Text style={styles.deleteBtnText}>Tüm Verileri Sil</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Harcamalarım v1.0.0</Text>
          <Text style={styles.appInfoText}>Tüm veriler cihazında saklanır</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, paddingBottom: 40 },
  title: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '800', marginBottom: Spacing.md },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  dangerCard: { borderColor: Colors.danger + '44' },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  cardTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm },
  cardDesc: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: Spacing.sm },
  currencyRow: { flexDirection: 'row', gap: Spacing.sm },
  currencyBtn: {
    width: 52, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt,
  },
  currencyText: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  budgetInputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm, gap: 4,
  },
  budgetCurrency: { color: Colors.primary, fontSize: FontSize.xl, fontWeight: '700' },
  budgetInput: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '600' },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.sm + 2,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  catList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs + 2 },
  catItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
  },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '500' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    padding: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.danger + '66',
    justifyContent: 'center',
  },
  deleteBtnText: { color: Colors.danger, fontWeight: '600', fontSize: FontSize.sm },
  appInfo: { alignItems: 'center', gap: 4, marginTop: Spacing.sm },
  appInfoText: { color: Colors.textSecondary, fontSize: FontSize.xs },
});

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  Modal,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';
import { getSettings, saveSettings, clearAllData, getExpenses } from '../../store/storage';
import { Category } from '../../constants/categories';
import { recalculateAllExpenses } from '../../services/exchangeRate';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ModalType = 'currency' | 'budget' | 'clearData' | null;

export default function SettingsScreen() {
  const [currency, setCurrency] = useState('₺');
  const [budgetText, setBudgetText] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgetEnabled, setBudgetEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [modalType, setModalType] = useState<ModalType>(null);
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);

  const load = useCallback(async () => {
    const s = await getSettings();
    setCurrency(s.currency);
    setBudgetEnabled(s.monthlyBudget > 0);
    setBudgetText(s.monthlyBudget > 0 ? s.monthlyBudget.toString() : '');
    setCategories(s.categories);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // ── Para birimi ───────────────────────────────────────────
  function handleCurrencyClick(newCur: string) {
    if (newCur === currency || saving) return;
    setPendingCurrency(newCur);
    setModalType('currency');
  }

  async function confirmCurrencyChange() {
    if (!pendingCurrency) return;
    setModalType(null);
    setSaving(true);
    try {
      const allExpenses = await getExpenses();
      const updatedExpenses = await recalculateAllExpenses(allExpenses, pendingCurrency);
      await AsyncStorage.setItem('expenses', JSON.stringify(updatedExpenses));
      await saveSettings({ currency: pendingCurrency });
      setCurrency(pendingCurrency);
      setPendingCurrency(null);
    } catch {
      // sessiz hata
    } finally {
      setSaving(false);
    }
  }

  // ── Bütçe ─────────────────────────────────────────────────
  async function handleToggleBudget(val: boolean) {
    setBudgetEnabled(val);
    if (!val) {
      setBudgetText('');
      await saveSettings({ monthlyBudget: 0 });
    }
  }

  async function confirmBudgetSave() {
    setModalType(null);
    setSaving(true);
    const parsed = parseFloat(budgetText.replace(',', '.'));
    await saveSettings({
      monthlyBudget: budgetEnabled && !isNaN(parsed) && parsed > 0 ? parsed : 0,
    });
    setSaving(false);
  }

  // ── Veri temizle ──────────────────────────────────────────
  async function confirmClearData() {
    setModalType(null);
    await clearAllData();
    await load();
  }

  const CURRENCIES = ['₺', '$', '€', '£'];

  // ── Modal içerikleri ──────────────────────────────────────
  const modalConfig = {
    currency: {
      icon: 'swap-horizontal' as const,
      iconColor: Colors.primary,
      iconBg: Colors.primary + '20',
      title: 'Döviz Çevrimi Yapılsın mı?',
      desc: (
        <Text style={styles.modalDesc}>
          Tüm harcamaların {currency} biriminden{' '}
          <Text style={{ color: Colors.primary, fontWeight: '800' }}>{pendingCurrency}</Text>{' '}
          birimine çevrilecek. Bu işlem geri alınamaz.
        </Text>
      ),
      confirmText: 'Çevir ve Kaydet',
      confirmColor: Colors.primaryGradient as any,
      onConfirm: confirmCurrencyChange,
    },
    budget: {
      icon: 'wallet-outline' as const,
      iconColor: Colors.primary,
      iconBg: Colors.primary + '20',
      title: 'Bütçe Güncellensin mi?',
      desc: (
        <Text style={styles.modalDesc}>
          Aylık bütçe hedefin{' '}
          <Text style={{ color: Colors.primary, fontWeight: '800' }}>
            {currency}{parseFloat(budgetText.replace(',', '.') || '0').toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </Text>{' '}
          olarak kaydedilecek.
        </Text>
      ),
      confirmText: 'Kaydet',
      confirmColor: Colors.primaryGradient as any,
      onConfirm: confirmBudgetSave,
    },
    clearData: {
      icon: 'trash-outline' as const,
      iconColor: Colors.danger,
      iconBg: Colors.danger + '20',
      title: 'Tüm Veriler Silinsin mi?',
      desc: (
        <Text style={styles.modalDesc}>
          Tüm harcamalar ve ayarlar kalıcı olarak silinecek.{' '}
          <Text style={{ color: Colors.danger, fontWeight: '800' }}>Bu işlem geri alınamaz.</Text>
        </Text>
      ),
      confirmText: 'Evet, Sil',
      confirmColor: Colors.dangerGradient as any,
      onConfirm: confirmClearData,
    },
  };

  const activeModal = modalType ? modalConfig[modalType] : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <Text style={styles.headerTitle}>Ayarlar</Text>

        {/* Para Birimi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sistem Para Birimi</Text>
          <Text style={styles.sectionDesc}>Tüm raporlar seçilen birime göre anlık çevrilir.</Text>
          <View style={styles.currencyGrid}>
            {CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => handleCurrencyClick(c)}
                disabled={saving}
                style={[styles.currencyBtn, currency === c && styles.currencyBtnActive]}
              >
                {currency === c && (
                  <LinearGradient
                    colors={Colors.primaryGradient as any}
                    style={StyleSheet.absoluteFill}
                    borderRadius={Radius.md}
                  />
                )}
                <Text style={[styles.currencyText, currency === c && { color: '#fff' }]}>{c}</Text>
                {saving && pendingCurrency === c && (
                  <ActivityIndicator size="small" color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bütçe */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Aylık Bütçe Hedefi</Text>
            <Switch
              value={budgetEnabled}
              onValueChange={handleToggleBudget}
              trackColor={{ false: Colors.surfaceAlt, true: Colors.primary + '80' }}
              thumbColor={budgetEnabled ? Colors.primary : Colors.textSecondary}
            />
          </View>
          {budgetEnabled && (
            <>
              <View style={styles.inputBox}>
                <Text style={styles.inputCurrency}>{currency}</Text>
                <TextInput
                  style={styles.input}
                  value={budgetText}
                  onChangeText={setBudgetText}
                  placeholder="0,00"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="decimal-pad"
                />
              </View>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setModalType('budget')}
                disabled={saving}
              >
                <LinearGradient
                  colors={Colors.primaryGradient as any}
                  style={styles.btnGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnText}>Bütçeyi Güncelle</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Kategoriler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kategorilerim</Text>
          <View style={styles.catGrid}>
            {categories.map((cat) => (
              <View key={cat.id} style={styles.catBadge}>
                <View style={[styles.catIconBox, { backgroundColor: cat.color + '20' }]}>
                  <Ionicons name={cat.icon as any} size={16} color={cat.color} />
                </View>
                <Text style={styles.catName}>{cat.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Veri Yönetimi */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={styles.dangerTitle}>Veri Yönetimi</Text>
          <TouchableOpacity style={styles.dangerBtn} onPress={() => setModalType('clearData')}>
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            <Text style={styles.dangerBtnText}>Tüm Verileri Temizle</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Harcamalarım v2.0.0</Text>
        </View>
      </ScrollView>

      {/* Unified Modal */}
      <Modal visible={!!activeModal} transparent animationType="fade" onRequestClose={() => setModalType(null)}>
        <View style={styles.modalOverlay}>
          {activeModal && (
            <View style={styles.modalContent}>
              <View style={[styles.modalIconBox, { backgroundColor: activeModal.iconBg }]}>
                <Ionicons name={activeModal.icon} size={32} color={activeModal.iconColor} />
              </View>
              <Text style={styles.modalTitle}>{activeModal.title}</Text>
              {activeModal.desc}
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setModalType(null)}>
                  <Text style={styles.modalCancelText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirm} onPress={activeModal.onConfirm}>
                  <LinearGradient colors={activeModal.confirmColor} style={styles.modalBtnGradient}>
                    <Text style={styles.modalConfirmText}>{activeModal.confirmText}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, paddingBottom: 60 },
  headerTitle: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '900', marginBottom: Spacing.xl },

  section: {
    backgroundColor: Colors.surface, padding: Spacing.lg, borderRadius: Radius.xl,
    marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '800' },
  sectionDesc: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600', marginBottom: Spacing.lg },

  currencyGrid: { flexDirection: 'row', gap: Spacing.sm },
  currencyBtn: {
    flex: 1, height: 50, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  currencyBtnActive: { borderColor: Colors.primary },
  currencyText: { fontSize: FontSize.lg, fontWeight: '900', color: Colors.textPrimary },

  inputBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.lg, paddingHorizontal: 16, height: 56, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  inputCurrency: { color: Colors.primary, fontSize: FontSize.lg, fontWeight: '800', marginRight: 8 },
  input: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },

  primaryBtn: { height: 54, borderRadius: Radius.lg, overflow: 'hidden' },
  btnGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.sm },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surfaceAlt, padding: Spacing.sm,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    width: '48%',
  },
  catIconBox: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  catName: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700', flex: 1 },

  dangerSection: { borderColor: Colors.danger + '33' },
  dangerTitle: { color: Colors.danger, fontSize: FontSize.md, fontWeight: '800', marginBottom: Spacing.md },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 50, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.danger + '66',
  },
  dangerBtnText: { color: Colors.danger, fontWeight: '700' },

  footer: { alignItems: 'center', marginTop: Spacing.xl },
  footerText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: Spacing.xl },
  modalContent: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  modalIconBox: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  modalTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '900', textAlign: 'center', marginBottom: 12 },
  modalDesc: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancel: { flex: 1, height: 50, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceAlt },
  modalCancelText: { color: Colors.textSecondary, fontWeight: '700' },
  modalConfirm: { flex: 1.5, height: 50, borderRadius: Radius.md, overflow: 'hidden' },
  modalBtnGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalConfirmText: { color: '#fff', fontWeight: '800' },
});

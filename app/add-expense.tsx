import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Modal,
  Platform,
} from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';
import { getSettings, addExpense } from '../store/storage';
import { Category } from '../constants/categories';
import { getRatesForDate, getExchangeRate } from '../services/exchangeRate';

function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function AddExpenseScreen() {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [currency, setCurrency] = useState('₺');
  const [categories, setCategories] = useState<Category[]>([]);
  const [systemCurrency, setSystemCurrency] = useState('₺');
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date());
  const [tempDate, setTempDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [previewRate, setPreviewRate] = useState<number | null>(null);
  const [previewConverted, setPreviewConverted] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const settings = await getSettings();
      setCategories(settings.categories);
      setSystemCurrency(settings.currency);
      setCurrency(settings.currency);
      if (settings.categories.length > 0) {
        setCategoryId(settings.categories[0].id);
      }
    })();
  }, []);

  // Kur önizlemesi: tutar veya para birimi değişince hesapla
  useEffect(() => {
    if (currency === systemCurrency) {
      setPreviewRate(null);
      setPreviewConverted(null);
      return;
    }
    const num = parseFloat(amount.replace(',', '.'));
    if (isNaN(num) || num <= 0) {
      setPreviewRate(null);
      setPreviewConverted(null);
      return;
    }
    let cancelled = false;
    setRateLoading(true);
    (async () => {
      try {
        const dateStr = formatDateLocal(date);
        const rates = await getRatesForDate(dateStr);
        const rate = getExchangeRate(currency, systemCurrency, rates);
        if (!cancelled) {
          setPreviewRate(rate);
          setPreviewConverted(num * rate);
        }
      } catch {
        // sessizce geç
      } finally {
        if (!cancelled) setRateLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [amount, currency, systemCurrency, date]);

  async function handleSave() {
    const num = parseFloat(amount.replace(',', '.'));
    if (isNaN(num) || num <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir tutar girin.');
      return;
    }
    if (!categoryId) {
      Alert.alert('Hata', 'Lütfen bir kategori seçin.');
      return;
    }

    setLoading(true);
    try {
      let convertedAmount = num;
      let rate = 1;
      const dateStr = formatDateLocal(date);

      if (currency !== systemCurrency) {
        const rates = await getRatesForDate(dateStr);
        rate = getExchangeRate(currency, systemCurrency, rates);
        convertedAmount = num * rate;
      }

      await addExpense({
        amount: num,
        currency,
        convertedAmount,
        exchangeRate: rate,
        categoryId,
        note,
        date: dateStr,
      });
      router.back();
    } catch (err) {
      Alert.alert('Hata', 'Kayıt yapılamadı.');
    } finally {
      setLoading(false);
    }
  }

  const CURRENCIES = ['₺', '$', '€', '£'];

  const formattedDate = date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Harcama Ekle</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Amount Input Section */}
        <View style={styles.card}>
          <Text style={styles.label}>Tutar</Text>
          <View style={styles.amountWrapper}>
            <Text style={styles.currencySymbol}>{currency}</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0,00"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>

          <View style={styles.currencyGrid}>
            {CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setCurrency(c)}
                style={[styles.currencyBtn, currency === c && styles.currencyBtnActive]}
              >
                {currency === c && (
                  <LinearGradient
                    colors={Colors.primaryGradient as any}
                    style={[StyleSheet.absoluteFill, { borderRadius: Radius.md }]}
                  />
                )}
                <Text style={[styles.currencyText, currency === c && { color: '#fff' }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Kur önizlemesi */}
          {currency !== systemCurrency && (
            <View style={styles.rateBox}>
              <Ionicons name="swap-horizontal-outline" size={14} color={Colors.primary} />
              {rateLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 6 }} />
              ) : previewRate !== null && previewConverted !== null ? (
                <Text style={styles.rateText}>
                  1 {currency} ≈ {previewRate.toFixed(4)} {systemCurrency}
                  {'   '}
                  <Text style={styles.rateConverted}>
                    = {previewConverted.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {systemCurrency}
                  </Text>
                </Text>
              ) : (
                <Text style={styles.rateText}>Tutar girerek kuru görüntüle</Text>
              )}
            </View>
          )}
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tarih</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => { setTempDate(date); setShowDatePicker(true); }}>
            <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
            <Text style={styles.dateBtnText}>{formattedDate}</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* iOS: styled bottom sheet modal */}
        {Platform.OS === 'ios' && (
          <Modal
            visible={showDatePicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.dateModalOverlay}>
              <View style={styles.dateModalSheet}>
                <View style={styles.dateModalHandle} />
                <View style={styles.dateModalHeader}>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    style={styles.dateModalCancelBtn}
                  >
                    <Text style={styles.dateModalCancelText}>İptal</Text>
                  </TouchableOpacity>
                  <Text style={styles.dateModalTitle}>Tarih Seç</Text>
                  <TouchableOpacity
                    onPress={() => { setDate(tempDate); setShowDatePicker(false); }}
                    style={styles.dateModalConfirmBtn}
                  >
                    <Text style={styles.dateModalConfirmText}>Tamam</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  maximumDate={new Date()}
                  textColor={Colors.textPrimary}
                  accentColor={Colors.primary}
                  style={styles.datePicker}
                  onChange={(_event: unknown, selected?: Date) => {
                    if (selected) setTempDate(selected);
                  }}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Android: native dialog */}
        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(_event: unknown, selected?: Date) => {
              setShowDatePicker(false);
              if (selected) setDate(selected);
            }}
          />
        )}

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kategori</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setCategoryId(cat.id)}
                style={[
                  styles.catBtn,
                  categoryId === cat.id && { backgroundColor: cat.color + '20', borderColor: cat.color }
                ]}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={15}
                  color={categoryId === cat.id ? cat.color : Colors.textSecondary}
                />
                <Text style={[styles.catName, categoryId === cat.id && { color: cat.color }]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Note Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Not / Açıklama</Text>
          <View style={styles.noteInputBox}>
             <TextInput
               style={styles.noteInput}
               value={note}
               onChangeText={setNote}
               placeholder="Harcama detayını buraya yazabilirsin..."
               placeholderTextColor={Colors.textSecondary}
               multiline
             />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          <LinearGradient
            colors={Colors.primaryGradient as any}
            style={styles.saveBtnInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.saveBtnText}>Harcamayı Kaydet</Text>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.lg
  },
  headerTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '800' },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center'
  },
  scroll: { padding: Spacing.md, paddingBottom: 100 },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.md,
    marginBottom: Spacing.xl, borderWidth: 1, borderColor: Colors.border
  },
  label: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  amountWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  currencySymbol: { color: Colors.textPrimary, fontSize: 28, fontWeight: '900', marginRight: 6, opacity: 0.8 },
  amountInput: { color: Colors.textPrimary, fontSize: 36, fontWeight: '900', textAlign: 'center', minWidth: 120 },

  currencyGrid: { flexDirection: 'row', gap: 10 },
  currencyBtn: {
    flex: 1, height: 50, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden'
  },
  currencyBtnActive: { borderColor: Colors.primary },
  currencyText: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textSecondary },

  section: { marginBottom: Spacing.xl },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '800', marginBottom: 16 },

  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: 16, borderWidth: 1, borderColor: Colors.border,
  },
  dateBtnText: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600' },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: Radius.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    width: '48%',
  },
  catName: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700', flex: 1 },

  noteInputBox: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: 16,
    borderWidth: 1, borderColor: Colors.border, height: 120
  },
  noteInput: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '500', textAlignVertical: 'top' },

  saveBtn: { marginTop: Spacing.lg, height: 60, borderRadius: Radius.xl, overflow: 'hidden', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 12 },
  saveBtnInner: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  saveBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },

  dateModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
  },
  dateModalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    paddingBottom: 40, borderWidth: 1, borderColor: Colors.border,
  },
  dateModalHandle: {
    width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2,
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  dateModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  dateModalTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '800' },
  dateModalCancelBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  dateModalCancelText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600' },
  dateModalConfirmBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  dateModalConfirmText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: '800' },
  datePicker: { alignSelf: 'center', width: '100%' },

  rateBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 16, backgroundColor: Colors.primary + '15',
    borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.primary + '30',
  },
  rateText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600', flex: 1 },
  rateConverted: { color: Colors.primary, fontWeight: '800' },
});

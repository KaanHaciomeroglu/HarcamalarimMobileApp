# mobilHarcamalarim — Uygulama Planı

## Genel Bakış

Kişisel harcama takip uygulaması. Günlük ve aylık harcamaları kategorilere göre girilebilir, dashboard ekranında özet ve grafikler görüntülenir. Tüm veriler cihazda yerel olarak saklanır (AsyncStorage). Sunucu veya domain gerekmez.

---

## Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| Framework | React Native + Expo (SDK 54) |
| Navigasyon | Expo Router (file-based) |
| Yerel depolama | AsyncStorage (`@react-native-async-storage/async-storage`) |
| Grafikler | `react-native-gifted-charts` |
| UI bileşenleri | Custom + `@expo/vector-icons` |
| Tarih işlemleri | `date-fns` |
| AI | Google Gemini REST API (`gemini-2.5-flash`), `@google/generative-ai` kaldırıldı — direkt `fetch` kullanılıyor |
| Build | EAS Build (cloud APK) |

---

## Ekranlar

### 1. Dashboard (Ana Ekran)
- Bu ayki toplam harcama
- Kategorilere göre dağılım (bar grafik)
- Son 5 harcama özeti
- Aylık bütçe hedefi ve kalan miktar

### 2. Harcama Ekle
- Tutar girişi
- Kategori seçimi
- Tarih seçimi (varsayılan: bugün)
- Not alanı (opsiyonel) — klavye açılınca görünür kalır
- Kaydet sonrası **AI yorum paneli**: harcama bağlamında somut tavsiye ve yönlendirme içeren yorum gösterir; yorum harcamayla birlikte kaydedilir
- "Tamam" butonu yorum bitince aktif olur, "Yorumu beklemeden kapat" linki her zaman görünür

### 3. Harcama Listesi
- Kategoriye göre filtre (chip'ler)
- Tarih bazlı gruplama, bölüm toplamları
- Tapa → düzenle/sil modalı

### 4. Aylık Özet
- Ay seçici (önceki aylara gidebilme)
- Toplam harcama + geçen ayla karşılaştırma (trending ikonları)
- Bar grafik: gün bazlı harcama dağılımı (scrollable)
- **AI ile Analiz Et** butonu: kategori dağılımı, günlük ortalama, bütçe durumu, önceki ay farkını analiz eder; rakamsal hedefler ve somut öneriler içerir; scrollable panel içinde gösterir

### 5. Ayarlar
- Para birimi seçimi (₺ / $ / € / £)
- Aylık bütçe hedefi belirleme
- Kategoriler listesi
- Tüm verileri sıfırla (danger zone)

---

## Veri Modeli

### Harcama (Expense)
```json
{
  "id": "timestamp-random",
  "amount": 150.50,
  "categoryId": "yemek",
  "date": "2026-04-14",
  "note": "Öğle yemeği",
  "createdAt": "2026-04-14T12:30:00Z",
  "aiComment": "AI tarafından üretilen yorum metni"
}
```

### Kategori (Category)
```json
{
  "id": "yemek",
  "name": "Yemek & İçecek",
  "color": "#FF8C69"
}
```

### Ayarlar (Settings)
```json
{
  "currency": "₺",
  "monthlyBudget": 5000,
  "categories": [ ... ]
}
```

---

## Renk Teması (Koyu)

| Token | Renk | Kullanım |
|-------|------|----------|
| `background` | #0F1117 | Ana arka plan |
| `surface` | #1A1D27 | Kart / panel arka planı |
| `surfaceAlt` | #22263A | İkincil kart |
| `primary` | #6C63FF | Vurgu rengi (mor-indigo) |
| `primaryMuted` | #6C63FF26 | Vurgu arka planı (transparan) |
| `success` | #4ADE80 | Pozitif / bütçe tamam |
| `danger` | #F87171 | Hata / bütçe aşıldı |
| `textPrimary` | #F1F2F6 | Ana metin |
| `textSecondary` | #8B8FA8 | İkincil metin |
| `border` | #2E3248 | Kenarlık |

---

## Kategoriler

| # | Kategori | Renk |
|---|----------|------|
| 1 | Yemek & İçecek | #FF8C69 |
| 2 | Market | #4ADE80 |
| 3 | Ulaşım | #60A5FA |
| 4 | Faturalar & Abonelikler | #FBBF24 |
| 5 | Sağlık | #F472B6 |
| 6 | Eğlence | #A78BFA |
| 7 | Giyim & Aksesuar | #34D399 |
| 8 | Kişisel Bakım | #FB923C |
| 9 | Eğitim | #38BDF8 |
| 10 | Ev & Yaşam | #E879F9 |
| 11 | Diğer | #94A3B8 |

---

## Proje Dizin Yapısı

```
mobilHarcamalarimApp/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab bar (safe area otomatik)
│   │   ├── index.tsx            # Dashboard
│   │   ├── expenses.tsx         # Harcama listesi
│   │   ├── monthly.tsx          # Aylık özet + AI analizi
│   │   └── settings.tsx         # Ayarlar
│   ├── add-expense.tsx          # Harcama ekle (modal) + AI yorum + kaydetme
│   ├── edit-expense.tsx         # Harcama düzenle/sil + AI yorumu görüntüleme
│   └── _layout.tsx              # Root stack (modal tanımları)
├── services/
│   └── ai.ts                    # callGemini(), getExpenseComment(), getMonthlyAnalysis()
├── hooks/
│   ├── useExpenses.ts
│   └── useSettings.ts
├── store/
│   └── storage.ts               # AsyncStorage CRUD, Expense/Settings interface
├── constants/
│   ├── categories.ts            # 11 kategori tanımı
│   ├── theme.ts                 # Koyu renk paleti, Spacing, Radius, FontSize
│   └── config.ts                # GEMINI_API_KEY
├── eas.json                     # EAS Build profilleri (preview APK, production AAB)
└── PLAN.md
```

---

## Geliştirme Adımları

1. ✅ **Proje kurulumu** — `npx create-expo-app` (mobilHarcamalarimApp), bağımlılıklar `--legacy-peer-deps`
2. ✅ **Veri katmanı** — AsyncStorage CRUD, `aiComment` alanı Expense modeline eklendi
3. ✅ **Navigasyon** — 4 tab + modal yapısı
4. ✅ **Harcama Ekle ekranı** — Form, klavye düzeltmesi (`behavior="height"`), AI yorum paneli
5. ✅ **Harcama Düzenle ekranı** — Prefill form, sil butonu, AI yorumu sol çizgiyle gösterim
6. ✅ **Harcama Listesi ekranı** — Tarih gruplamalı, kategori filtre chip'leri
7. ✅ **Dashboard** — Aylık toplam, bütçe bar, kategori dağılımı, son 5 harcama
8. ✅ **Aylık Özet ekranı** — Ay seçici, günlük bar grafik, kategori breakdown, AI analiz butonu
9. ✅ **Ayarlar ekranı** — Para birimi, bütçe, kategoriler, veri sıfırlama
10. ✅ **AI entegrasyonu** — Gemini REST API (`fetch`), `gemini-2.5-flash`, `maxOutputTokens: 2048`
11. ✅ **AI yorum kalitesi** — Finans koçu sistem promptu, somut tavsiye + rakamsal hedef zorunluluğu
12. ✅ **AI yorum kalıcılığı** — Yorum `updateExpense` ile kaydediliyor, edit ekranında görüntüleniyor
13. ✅ **UI düzeltmeleri** — Tab bar safe area, klavye not alanını gizleme, AI kutusu scrollable
14. ✅ **EAS Build** — `eas.json` oluşturuldu, PC'siz APK build alınabilir

---

## AI Entegrasyonu

### Kurulum
`constants/config.ts` dosyasındaki `GEMINI_API_KEY` değerini [aistudio.google.com/apikey](https://aistudio.google.com/apikey) adresinden alınan anahtarla değiştir.

### Özellikler

| Özellik | Tetikleyici | Fonksiyon | Model |
|---------|-------------|-----------|-------|
| Harcama yorumu | Kaydet butonu | `getExpenseComment()` | gemini-2.5-flash |
| Aylık analiz | "AI ile Analiz Et" butonu | `getMonthlyAnalysis()` | gemini-2.5-flash |

### Mimari
- SDK yerine doğrudan `fetch` ile Gemini REST API çağrılıyor (React Native/Hermes uyumluluğu için)
- `onChunk / onDone / onError` callback pattern — mevcut UI akışıyla uyumlu
- Yorum tamamlanınca `updateExpense` ile harcamaya yazılıyor
- `maxOutputTokens: 2048` — yanıtların yarıda kesilmesini önler

### Prompt Felsefesi
- Sistem promptu: "finans koçu" rolü, sadece gözlem değil her yanıtta somut aksiyon zorunlu
- Harcama yorumu: kategori aylık durumu + bütçe etkisi + limit/alternatif önerisi
- Aylık analiz: en yüksek kategoriler, önceki ay karşılaştırması, gelecek ay için rakamsal hedefler

---

## Kurulum ve Çalıştırma

### Geliştirme (Expo Go)
```bash
cd mobilHarcamalarimApp
npm install --legacy-peer-deps
# constants/config.ts içindeki GEMINI_API_KEY değerini doldur
npx expo start
# QR kodu Expo Go uygulamasıyla tara (bilgisayar ve telefon aynı Wi-Fi'da olmalı)
```

### Bağımsız APK (PC'siz çalışır)
```bash
npm install -g eas-cli
eas login          # expo.dev hesabı gerekli (ücretsiz)
eas build -p android --profile preview
# Build ~10 dakika sürer, indirme linki SMS/mail ile gelir
# APK'yı telefona indir, "Bilinmeyen kaynak" iznini ver, yükle
```

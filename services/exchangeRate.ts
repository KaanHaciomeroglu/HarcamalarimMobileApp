import { Expense } from '../store/storage';

/**
 * TCMB (Türkiye Cumhuriyet Merkez Bankası) döviz kuru servisi.
 * ForexSelling kurlarını çeker. TRY taban para birimidir.
 *
 * Kur değeri: 1 birim yabancı para = X TRY
 */

// Bellek içi önbellek: tarih -> { USD: rate, EUR: rate, GBP: rate }
const rateCache: Record<string, Record<string, number>> = {};

/** TCMB XML'inden belirli bir dövizin ForexSelling kurunu çıkarır */
function extractRate(xml: string, code: string): number {
  // CurrencyCode="USD" ... <ForexSelling>38.1234</ForexSelling>
  const regex = new RegExp(
    `CurrencyCode="${code}"[\\s\\S]*?<ForexSelling>([\\d.]+)<\\/ForexSelling>`,
    'i'
  );
  const m = xml.match(regex);
  if (m && m[1]) return parseFloat(m[1]);
  return 0;
}

/** TCMB URL'si: https://www.tcmb.gov.tr/kurlar/YYYYMM/DDMMYYYY.xml */
function buildUrl(date: string): string {
  const [year, month, day] = date.split('-');
  return `https://www.tcmb.gov.tr/kurlar/${year}${month}/${day}${month}${year}.xml`;
}

// Servis başarısız olursa kullanılacak yedek kurlar (Yaklaşık, Nisan 2026)
const FALLBACK_RATES: Record<string, number> = {
  USD: 38.50,
  EUR: 43.80,
  GBP: 51.20,
  TRY: 1,
};

/**
 * Belirli bir tarih için TCMB kurlarını döndürür.
 * Hafta sonu / tatil günlerinde en son iş günü kurunu bulmak için
 * geriye doğru en fazla 7 gün dener.
 *
 * @returns { USD, EUR, GBP } — 1 birim = X TRY (ForexSelling)
 */
export async function getRatesForDate(date: string): Promise<Record<string, number>> {
  if (rateCache[date]) return rateCache[date];

  // Belirtilen tarihten başlayarak geriye git (max 7 gün)
  const [baseY, baseM, baseD] = date.split('-').map(Number);
  for (let offset = 0; offset <= 7; offset++) {
    // Yerel saat üzerinden tarih hesapla (UTC parse hatasını önler)
    const d = new Date(baseY, baseM - 1, baseD - offset);
    const tryDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (rateCache[tryDate]) {
      rateCache[date] = rateCache[tryDate];
      return rateCache[date];
    }

    try {
      const url = buildUrl(tryDate);
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const xml = await res.text();

      const rates: Record<string, number> = {
        USD: extractRate(xml, 'USD'),
        EUR: extractRate(xml, 'EUR'),
        GBP: extractRate(xml, 'GBP'),
      };

      if (rates.USD > 0) {
        rateCache[tryDate] = rates;
        rateCache[date] = rates;
        return rates;
      }
    } catch {
      // Bu gün için istek başarısız
    }
  }

  // Tüm denemeler başarısız olursa yedek kurları dön
  return FALLBACK_RATES;
}

/** Para birimi sembolünü TCMB koduna çevirir */
export function symbolToCode(symbol: string): string {
  const map: Record<string, string> = {
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '₺': 'TRY',
  };
  return map[symbol] ?? symbol;
}

/**
 * Bir tutarı kaynak para biriminden hedef para birimine çevirir.
 * TRY taban para birimidir (kur = 1).
 *
 * @param amount - Çevrilecek tutar
 * @param fromSymbol - Kaynak para birimi sembolü (₺, $, €, £)
 * @param toSymbol   - Hedef para birimi sembolü
 * @param rates      - { USD, EUR, GBP } → 1 birim = X TRY
 * @returns Hedef para birimindeki tutar
 */
export function convertAmount(
  amount: number,
  fromSymbol: string,
  toSymbol: string,
  rates: Record<string, number>
): number {
  if (fromSymbol === toSymbol) return amount;

  // Önce TRY'ye çevir
  let amountInTRY: number;
  if (fromSymbol === '₺') {
    amountInTRY = amount;
  } else {
    const fromRate = rates[symbolToCode(fromSymbol)];
    if (!fromRate) return amount; // Kur alınamadıysa orijinal tutarı kullan
    amountInTRY = amount * fromRate;
  }

  // TRY'den hedef para birimine çevir
  if (toSymbol === '₺') {
    return amountInTRY;
  } else {
    const toRate = rates[symbolToCode(toSymbol)];
    if (!toRate) return amountInTRY;
    return amountInTRY / toRate;
  }
}

/**
 * Verilen iki para birimi arasındaki exchange rate'i döndürür.
 * (1 birim fromSymbol = ? toSymbol)
 */
export function getExchangeRate(
  fromSymbol: string,
  toSymbol: string,
  rates: Record<string, number>
): number {
  if (fromSymbol === toSymbol) return 1;
  // 1 birim from → TRY → to
  const fromInTRY = fromSymbol === '₺' ? 1 : (rates[symbolToCode(fromSymbol)] ?? 0);
  const toInTRY = toSymbol === '₺' ? 1 : (rates[symbolToCode(toSymbol)] ?? 0);
  if (!fromInTRY || !toInTRY) return 1;
  return fromInTRY / toInTRY;
}

/**
 * Tüm harcamaları yeni sistem para birimine göre yeniden hesaplar.
 */
export async function recalculateAllExpenses(
  expenses: Expense[],
  newSystemCurrency: string
): Promise<Expense[]> {
  const updatedExpenses: Expense[] = [];

  for (const exp of expenses) {
    // Harcamanın yapıldığı tarihteki kurları al
    const rates = await getRatesForDate(exp.date);
    
    // Orijinal tutarı (amount) orijinal para biriminden (currency) yeni sistem birimine çevir
    const newConvertedAmount = convertAmount(exp.amount, exp.currency, newSystemCurrency, rates);
    const newRate = getExchangeRate(exp.currency, newSystemCurrency, rates);

    updatedExpenses.push({
      ...exp,
      convertedAmount: newConvertedAmount,
      exchangeRate: newRate,
    });
  }

  return updatedExpenses;
}

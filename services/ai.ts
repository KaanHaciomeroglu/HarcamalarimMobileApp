import { GEMINI_API_KEY } from '../constants/config';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `Sen deneyimli bir kişisel finans koçusun. Türkçe konuşuyorsun, samimi ve dürüst bir tonda yanıt veriyorsun.
Sadece gözlem yapmıyorsun — her yorumda mutlaka somut bir tavsiye veya yönlendirme yapıyorsun.
Gerektiğinde uyarıyorsun, gerektiğinde motive ediyorsun ama her zaman pratik bir sonraki adım öneriyorsun.
Emoji kullanıyorsun ama abartmıyorsun. Kullanıcının adını bilmiyorsun, doğrudan hitap ediyorsun.`;

async function callGemini(prompt: string): Promise<string> {
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `HTTP ${response.status}`);
  }

  const data = await response.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new Error('Boş yanıt döndü.');
  return text;
}

// ─── Tek harcama yorumu ───────────────────────────────────────────────────────

export interface ExpenseCommentInput {
  amount: number;
  categoryName: string;
  note: string;
  date: string;
  monthTotal: number;
  monthlyBudget: number;
  currency: string;
  categoryMonthTotal: number;
}

export async function getExpenseComment(
  input: ExpenseCommentInput,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> {
  const budgetInfo =
    input.monthlyBudget > 0
      ? `Aylık bütçe: ${input.currency}${input.monthlyBudget.toLocaleString('tr-TR')}. Bu ay şu ana kadar harcanan: ${input.currency}${input.monthTotal.toLocaleString('tr-TR')} (bütçenin %${Math.round((input.monthTotal / input.monthlyBudget) * 100)}'i).`
      : `Bu ay toplam harcama: ${input.currency}${input.monthTotal.toLocaleString('tr-TR')}.`;

  const prompt = `Yeni bir harcama eklendi:
- Tutar: ${input.currency}${input.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
- Kategori: ${input.categoryName}
- Tarih: ${format(new Date(input.date), 'd MMMM yyyy', { locale: tr })}
${input.note ? `- Not: ${input.note}` : ''}
- Bu kategoride bu ay toplam: ${input.currency}${input.categoryMonthTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
- ${budgetInfo}

Şunları yaparak 3-4 cümlelik bir yorum yaz:
1. Bu harcamanın bütçeye veya kategoriye etkisini değerlendir
2. Eğer dikkat çeken bir durum varsa (harcama yüksekse, kategori bu ay çok sık kullanıldıysa, bütçe doluyorsa) açıkça söyle
3. Kullanıcıya somut ve uygulanabilir bir tavsiye ver (örn. "Bu kategoride haftaya X kadar harcama yapma", "Alternatif olarak X'i deneyebilirsin", "Aylık limitini X olarak belirlemeyi düşün")
Düz gözlem yapma, her zaman bir aksiyon öner.`;

  try {
    const text = await callGemini(prompt);
    onChunk(text);
    onDone();
  } catch (e: any) {
    onError(e?.message ?? 'AI yorumu alınamadı.');
  }
}

// ─── Aylık analiz ─────────────────────────────────────────────────────────────

export interface MonthlyAnalysisInput {
  month: string;
  total: number;
  prevTotal: number;
  budget: number;
  currency: string;
  categoryBreakdown: Array<{ name: string; total: number; pct: number }>;
  dailyAverage: number;
  expenseCount: number;
}

export async function getMonthlyAnalysis(
  input: MonthlyAnalysisInput,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> {
  const monthLabel = format(new Date(input.month + '-01'), 'MMMM yyyy', { locale: tr });

  const budgetInfo =
    input.budget > 0
      ? `Aylık bütçe: ${input.currency}${input.budget.toLocaleString('tr-TR')}. Bütçeye göre ${input.total > input.budget ? `${input.currency}${(input.total - input.budget).toLocaleString('tr-TR')} aşıldı` : `${input.currency}${(input.budget - input.total).toLocaleString('tr-TR')} kaldı`}.`
      : 'Aylık bütçe tanımlı değil.';

  const prevChange =
    input.prevTotal > 0
      ? `Geçen aya göre ${input.total > input.prevTotal ? `%${Math.round(((input.total - input.prevTotal) / input.prevTotal) * 100)} artış` : `%${Math.round(((input.prevTotal - input.total) / input.prevTotal) * 100)} azalış`} var.`
      : 'Geçen ay verisi yok.';

  const catList = input.categoryBreakdown
    .map((c) => `  • ${c.name}: ${input.currency}${c.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} (%${c.pct.toFixed(1)})`)
    .join('\n');

  const prompt = `${monthLabel} ayı harcama özeti:
- Toplam harcama: ${input.currency}${input.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
- İşlem sayısı: ${input.expenseCount}
- Günlük ortalama: ${input.currency}${input.dailyAverage.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
- ${prevChange}
- ${budgetInfo}

Kategorilere göre dağılım:
${catList}

Bu ayın harcama örüntüsünü derinlemesine analiz et. Şu yapıyı kullan:
- En fazla harcanan 1-2 kategoriye dikkat çek, bu normalin üzerinde miydi yorumla
- Geçen ayla kıyasla nerede iyileşme var, nerede kötüleşme var net söyle
- Bütçe durumunu değerlendir
- Gelecek ay için 2-3 tane gerçekçi ve uygulanabilir hedef öner (örn. "Yemek harcamalarını %20 azalt", "Market için haftalık X limit koy")
- Kısa bir motivasyon cümlesiyle bitir
Toplam 200-250 kelime, samimi ve doğrudan bir dil kullan.`;

  try {
    const text = await callGemini(prompt);
    onChunk(text);
    onDone();
  } catch (e: any) {
    onError(e?.message ?? 'AI analizi alınamadı.');
  }
}

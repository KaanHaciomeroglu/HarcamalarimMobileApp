import { Expense } from '../store/storage';
import { Category } from '../constants/categories';

export interface Insight {
  icon: string;
  color: string;
  title: string;
  text: string;
}

const DANGER  = '#FF4B6E';
const SUCCESS = '#00F294';
const WARNING = '#FFB800';
const INFO    = '#7B61FF';

function fmt(n: number, currency: string) {
  return `${currency}${n.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
}

export function generateInsights(
  expenses: Expense[],
  categories: Category[],
  currency: string,
): Insight[] {
  const now = new Date();
  const cm = now.getMonth();
  const cy = now.getFullYear();
  const pm = cm === 0 ? 11 : cm - 1;
  const py = cm === 0 ? cy - 1 : cy;

  const thisExps = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === cm && d.getFullYear() === cy;
  });

  if (thisExps.length === 0) return [];

  const lastExps = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === pm && d.getFullYear() === py;
  });

  const thisTotal = thisExps.reduce((s, e) => s + (e.convertedAmount ?? e.amount), 0);
  const lastTotal = lastExps.reduce((s, e) => s + (e.convertedAmount ?? e.amount), 0);

  const insights: Insight[] = [];

  // ── Kategori karşılaştırmaları ─────────────────────────────
  const catStats = categories.map(cat => {
    const thisAmt = thisExps.filter(e => e.categoryId === cat.id).reduce((s, e) => s + (e.convertedAmount ?? e.amount), 0);
    const lastAmt = lastExps.filter(e => e.categoryId === cat.id).reduce((s, e) => s + (e.convertedAmount ?? e.amount), 0);
    const pct = lastAmt > 0 ? ((thisAmt - lastAmt) / lastAmt) * 100 : null;
    return { cat, thisAmt, lastAmt, pct };
  }).filter(c => c.thisAmt > 0 || c.lastAmt > 0);

  // Geçen aydan %20+ artan kategoriler
  for (const s of catStats) {
    if (s.pct !== null && s.pct >= 20) {
      insights.push({
        icon: 'trending-up',
        color: DANGER,
        title: `${s.cat.name} harcamaların arttı`,
        text: `Bu ay ${fmt(s.thisAmt, currency)} harcadın — geçen aya göre %${Math.round(s.pct)} daha fazla. Bu kategoriye dikkat et.`,
      });
    }
  }

  // Geçen aydan %20+ azalan kategoriler
  for (const s of catStats) {
    if (s.pct !== null && s.pct <= -20) {
      insights.push({
        icon: 'trending-down',
        color: SUCCESS,
        title: `${s.cat.name} harcamaların azaldı`,
        text: `Bu ay ${fmt(s.thisAmt, currency)} harcadın — geçen aya göre %${Math.round(Math.abs(s.pct))} daha az. Harika gidiyor!`,
      });
    }
  }

  // Bu ay yeni başlayan kategori (geçen ay 0, bu ay var)
  for (const s of catStats) {
    if (s.lastAmt === 0 && s.thisAmt > 0 && lastExps.length > 0) {
      insights.push({
        icon: 'add-circle-outline',
        color: INFO,
        title: `${s.cat.name} bu ay yeni`,
        text: `Geçen ay hiç ${s.cat.name} harcaman yoktu, bu ay ${fmt(s.thisAmt, currency)} harcadın.`,
      });
    }
  }

  // ── Baskın kategori ────────────────────────────────────────
  const sorted = [...catStats].filter(c => c.thisAmt > 0).sort((a, b) => b.thisAmt - a.thisAmt);
  if (sorted.length > 0 && thisTotal > 0) {
    const top = sorted[0];
    const share = (top.thisAmt / thisTotal) * 100;
    if (share >= 40) {
      insights.push({
        icon: 'pie-chart-outline',
        color: WARNING,
        title: `${top.cat.name} bütçenin %${Math.round(share)}'i`,
        text: `Harcamalarının büyük çoğunluğu tek kategoride. Dağılımı dengelemeyi düşünebilirsin.`,
      });
    }
  }

  // ── Genel trend ────────────────────────────────────────────
  if (lastTotal > 0) {
    const overallPct = ((thisTotal - lastTotal) / lastTotal) * 100;
    if (overallPct >= 30) {
      insights.push({
        icon: 'alert-circle-outline',
        color: DANGER,
        title: 'Genel harcaman yükseliyor',
        text: `Bu ay toplamda geçen aya göre %${Math.round(overallPct)} daha fazla harcıyorsun (${fmt(thisTotal, currency)} / ${fmt(lastTotal, currency)}).`,
      });
    } else if (overallPct <= -15) {
      insights.push({
        icon: 'checkmark-circle-outline',
        color: SUCCESS,
        title: 'Harika bir ay geçiriyorsun',
        text: `Geçen aya göre %${Math.round(Math.abs(overallPct))} daha az harcıyorsun. Finansal hedefindesin!`,
      });
    }
  }

  // ── En sık harcama günü ────────────────────────────────────
  const dayCounts: Record<number, number> = {};
  for (const e of thisExps) {
    const day = new Date(e.date).getDay(); // 0=Pazar
    dayCounts[day] = (dayCounts[day] ?? 0) + 1;
  }
  const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const peakDay = Object.entries(dayCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  if (peakDay && Number(peakDay[1]) >= 3) {
    insights.push({
      icon: 'calendar-outline',
      color: INFO,
      title: `En çok ${dayNames[Number(peakDay[0])]} günleri harcıyorsun`,
      text: `Bu ay ${dayNames[Number(peakDay[0])]} günleri ${peakDay[1]} kez harcama yaptın. Haftalık planlamanı buna göre yapabilirsin.`,
    });
  }

  return insights;
}

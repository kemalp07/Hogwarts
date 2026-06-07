import { Language } from './translations';

const DAY_NAMES: Record<Language, Record<number, string>> = {
  tr: { 1: 'Pazartesi', 2: 'Salı', 3: 'Çarşamba', 4: 'Perşembe', 5: 'Cuma', 6: 'Cumartesi', 7: 'Pazar' },
  en: { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday' },
};

const SUBJECT_NAMES_EN: Record<string, string> = {
  'Büyülü İksirler': 'Potions',
  'Uçuş Dersi': 'Flying',
  Büyü: 'Charms',
  Dönüşüm: 'Transfiguration',
  Bitkibilim: 'Herbology',
  'Karanlık Sanatlara Karşı Korunma': 'Defence Against the Dark Arts',
  Tarih: 'History of Magic',
  Astronomi: 'Astronomy',
  'Serbest Çalışma': 'Free Study',
};

const DAY_NAME_TR_TO_NUM: Record<string, number> = {
  Pazartesi: 1,
  Salı: 2,
  Çarşamba: 3,
  Perşembe: 4,
  Cuma: 5,
  Cumartesi: 6,
  Pazar: 7,
};

export function getDayName(day: number, lang: Language): string {
  const fallback = lang === 'en' ? 'Day' : 'Gün';
  return DAY_NAMES[lang][day] ?? fallback;
}

export function localizeSubject(subject: string, lang: Language): string {
  if (lang !== 'en' || !subject) return subject;
  return SUBJECT_NAMES_EN[subject] ?? subject;
}

function localizeClass(cls: Record<string, unknown>, lang: Language) {
  return {
    ...cls,
    subject: localizeSubject(String(cls.subject ?? ''), lang),
  };
}

export function localizeScheduleData(data: Record<string, any> | null, lang: Language) {
  if (!data) return null;
  if (lang === 'tr') return data;

  const day = Number(data.day) || DAY_NAME_TR_TO_NUM[data.day_name] || 1;
  const tomorrowDay = Number(data.tomorrow_day) || (day >= 7 ? 1 : day + 1);

  return {
    ...data,
    day_name: getDayName(day, lang),
    tomorrow_day_name: getDayName(tomorrowDay, lang),
    schedule: (data.schedule ?? []).map((cls: Record<string, unknown>) => localizeClass(cls, lang)),
    tomorrow_schedule: (data.tomorrow_schedule ?? []).map((cls: Record<string, unknown>) =>
      localizeClass(cls, lang),
    ),
  };
}

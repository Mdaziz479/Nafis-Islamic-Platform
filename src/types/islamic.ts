export interface PrayerTimesData {
  readonly timings: {
    readonly Fajr: string;
    readonly Sunrise: string;
    readonly Dhuhr: string;
    readonly Asr: string;
    readonly Maghrib: string;
    readonly Isha: string;
  };
  readonly gregorianDate: string;
  readonly hijriDate: string;
  readonly hijriMonth: string;
  readonly hijriYear: string;
  readonly timezone: string;
  readonly method: string;
}

export interface HijriCalendarDay {
  readonly gregorianDate: string;
  readonly gregorianDay: number;
  readonly weekday: string;
  readonly hijriDate: string;
  readonly hijriDay: number;
  readonly hijriMonth: number;
  readonly hijriMonthName: string;
  readonly hijriMonthArabic: string;
  readonly hijriYear: number;
  readonly holidays: readonly string[];
  readonly lunarSighting: boolean | null;
}

export interface PrayerCalculationMethod {
  readonly id: number;
  readonly name: string;
}

export const PRAYER_CALCULATION_METHODS: readonly PrayerCalculationMethod[] = [
  { id: 0, name: "Jafari" },
  { id: 1, name: "University of Islamic Sciences, Karachi" },
  { id: 2, name: "Islamic Society of North America" },
  { id: 3, name: "Muslim World League" },
  { id: 4, name: "Umm Al-Qura University, Makkah" },
  { id: 5, name: "Egyptian General Authority of Survey" },
  { id: 7, name: "Institute of Geophysics, University of Tehran" },
  { id: 8, name: "Gulf Region" },
  { id: 9, name: "Kuwait" },
  { id: 10, name: "Qatar" },
  { id: 11, name: "Singapore" },
  { id: 12, name: "Union Organization Islamic de France" },
  { id: 13, name: "Diyanet İşleri Başkanlığı, Turkey" },
  { id: 14, name: "Spiritual Administration of Muslims of Russia" },
  { id: 15, name: "Moonsighting Committee Worldwide" },
  { id: 16, name: "Dubai" },
  { id: 17, name: "JAKIM, Malaysia" },
  { id: 18, name: "Tunisia" },
  { id: 19, name: "Algeria" },
  { id: 20, name: "KEMENAG, Indonesia" },
  { id: 21, name: "Morocco" },
  { id: 22, name: "Lisbon Islamic Community" },
  { id: 23, name: "Ministry of Awqaf, Jordan" },
  { id: 99, name: "Custom" },
];

export type HijriCalendarMethod = "HJCoSA" | "UAQ" | "DIYANET" | "MATHEMATICAL";

export const HIJRI_CALENDAR_METHODS: readonly { readonly id: HijriCalendarMethod; readonly name: string }[] = [
  { id: "HJCoSA", name: "High Judicial Council of Saudi Arabia" },
  { id: "UAQ", name: "Umm Al-Qura" },
  { id: "DIYANET", name: "Diyanet İşleri Başkanlığı" },
  { id: "MATHEMATICAL", name: "Mathematical" },
];
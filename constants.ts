export interface Sruthi {
  kattai: string;
  note: string;
  frequency: number; // Base frequency for Sa in Hz
}

export interface Swara {
  id: string;
  label: string;
  semitones: number; // Semitones from Sa
  shortLabel: string;
}

export interface Raga {
  name: string;
  swaras: Swara[];
}

export const PULSE_OPTIONS = [3, 5, 7, 0]; // Seconds, 0 represents Infinite

// Frequencies based on A4 = 440Hz, calculating C3 to B3
// Formula: f = 440 * 2^((n-49)/12) where n is key number. 
// C3 is approx 130.81Hz
export const SRUTHIS: Sruthi[] = [
  { kattai: "1", note: "C", frequency: 130.81 },
  { kattai: "1.5", note: "C#", frequency: 138.59 },
  { kattai: "2", note: "D", frequency: 146.83 },
  { kattai: "2.5", note: "D#", frequency: 155.56 },
  { kattai: "3", note: "E", frequency: 164.81 },
  { kattai: "4", note: "F", frequency: 174.61 },
  { kattai: "4.5", note: "F#", frequency: 185.00 },
  { kattai: "5", note: "G", frequency: 196.00 },
  { kattai: "5.5", note: "G#", frequency: 207.65 },
  { kattai: "6", note: "A", frequency: 220.00 },
  { kattai: "6.5", note: "A#", frequency: 233.08 },
  { kattai: "7", note: "B", frequency: 246.94 },
];

// Helper to create swara array for a raga
const createSwaras = (
  r: {label: string, semi: number},
  g: {label: string, semi: number},
  m: {label: string, semi: number},
  d: {label: string, semi: number},
  n: {label: string, semi: number}
): Swara[] => [
  { id: 'sa', label: 'Sa', shortLabel: 'S', semitones: 0 },
  { id: 'ri', label: 'Ri', shortLabel: r.label, semitones: r.semi },
  { id: 'ga', label: 'Ga', shortLabel: g.label, semitones: g.semi },
  { id: 'ma', label: 'Ma', shortLabel: m.label, semitones: m.semi },
  { id: 'pa', label: 'Pa', shortLabel: 'P', semitones: 7 },
  { id: 'da', label: 'Da', shortLabel: d.label, semitones: d.semi },
  { id: 'ni', label: 'Ni', shortLabel: n.label, semitones: n.semi },
  { id: 'sa-high', label: 'Sȧ', shortLabel: 'Ṡ', semitones: 12 },
];

const R1 = { label: 'R1', semi: 1 };
const R2 = { label: 'R2', semi: 2 };
const G2 = { label: 'G2', semi: 3 };
const G3 = { label: 'G3', semi: 4 };
const M1 = { label: 'M1', semi: 5 };
const M2 = { label: 'M2', semi: 6 };
const D1 = { label: 'D1', semi: 8 };
const D2 = { label: 'D2', semi: 9 };
const N2 = { label: 'N2', semi: 10 };
const N3 = { label: 'N3', semi: 11 };

export const RAGAS: Raga[] = [
  { name: "Mayamalavagowla", swaras: createSwaras(R1, G3, M1, D1, N3) }, // 15
  { name: "Kalyani", swaras: createSwaras(R2, G3, M2, D2, N3) }, // 65
  { name: "Shankarabharanam", swaras: createSwaras(R2, G3, M1, D2, N3) }, // 29
  { name: "Kharaharapriya", swaras: createSwaras(R2, G2, M1, D2, N2) }, // 22
  { name: "Hanumatodi", swaras: createSwaras(R1, G2, M1, D1, N2) }, // 8
  { name: "Harikambhoji", swaras: createSwaras(R2, G3, M1, D2, N2) }, // 28
  { name: "Natabhairavi", swaras: createSwaras(R2, G2, M1, D1, N2) }, // 20
  { name: "Keeravani", swaras: createSwaras(R2, G2, M1, D1, N3) }, // 21
  { name: "Shanmukhapriya", swaras: createSwaras(R2, G2, M2, D1, N2) }, // 56
  { name: "Simhendramadhyamam", swaras: createSwaras(R2, G2, M2, D1, N3) }, // 57
  { name: "Pantuvarali", swaras: createSwaras(R1, G3, M2, D1, N3) }, // 51
  { name: "Charukesi", swaras: createSwaras(R2, G3, M1, D1, N2) }, // 26
  { name: "Gowrimanohari", swaras: createSwaras(R2, G2, M1, D2, N3) }, // 23
  { name: "Chakravakam", swaras: createSwaras(R1, G3, M1, D2, N2) }, // 16
  { name: "Hemavathi", swaras: createSwaras(R2, G2, M2, D2, N2) }, // 58
];
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

// Shankarabharanam (Major Scale) intervals
export const SWARAS: Swara[] = [
  { id: 'sa', label: 'Sa', shortLabel: 'S', semitones: 0 },
  { id: 'ri', label: 'Ri', shortLabel: 'R2', semitones: 2 },
  { id: 'ga', label: 'Ga', shortLabel: 'G3', semitones: 4 },
  { id: 'ma', label: 'Ma', shortLabel: 'M1', semitones: 5 },
  { id: 'pa', label: 'Pa', shortLabel: 'P', semitones: 7 },
  { id: 'da', label: 'Da', shortLabel: 'D2', semitones: 9 },
  { id: 'ni', label: 'Ni', shortLabel: 'N3', semitones: 11 },
  { id: 'sa-high', label: 'Sȧ', shortLabel: 'Ṡ', semitones: 12 },
];
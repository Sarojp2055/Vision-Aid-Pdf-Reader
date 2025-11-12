
export enum Theme {
  Light = 'light',
  Dark = 'dark',
  HighContrast = 'high-contrast',
}

export interface ViewSettings {
  isInverted: boolean;
  isHighContrast: boolean;
  isGrayscale: boolean;
}

export type FileType = 'pdf' | 'image' | null;

export interface TranscriptEntry {
  speaker: 'user' | 'model';
  text: string;
}

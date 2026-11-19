import { requireNativeModule } from 'expo';

/** One line as ML Kit reports it, from one of the two bundled recognizers. */
export type NativeLine = {
  text: string;
  /** Four corners, clockwise from the top-left of the text. null when ML Kit gives none. */
  corners: { x: number; y: number }[] | null;
  box: { left: number; top: number; right: number; bottom: number } | null;
  /** 0 to 1. */
  confidence: number;
  /** Clockwise degrees, -180 to 180. */
  angle: number;
  /** BCP-47 code, or "und". */
  language: string | null;
  recognizer: 'latin' | 'devanagari';
};

export type NativeRecognition = {
  imageWidth: number;
  imageHeight: number;
  /** EXIF orientation tag of the file. 1 means the pixels are upright already. */
  exifOrientation: number;
  lines: NativeLine[];
};

type OverlaykitOcrNative = {
  load(): Promise<boolean>;
  recognizeStill(uri: string): Promise<NativeRecognition>;
};

export default requireNativeModule<OverlaykitOcrNative>('OverlaykitOcr');

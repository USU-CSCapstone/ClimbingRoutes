import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { photoExtension, type Scan } from '@/core/capture';
import type { Uuid } from '@/core/types';
import { createScan, savePhoto } from '@/data/scans';

/** What picking added: the scan, and how many picked files were left out for not being JPEG or HEIC. */
export interface Picked {
  /** Null only when nothing usable was picked and there was no scan yet. */
  scan: Scan | null;
  added: number;
  skipped: number;
}

/** A picked file, from the phone's library or the computer. */
interface PickedFile {
  uri: string;
  width: number;
  height: number;
  mimeType?: string | null;
  fileName?: string | null;
}

/**
 * The upload lane's photo picker (#52): several photos at once from the
 * phone's library, or files from the computer on the web. They're saved into
 * the scan, which is started with the first one. Null if nothing was picked.
 */
export async function pickPhotos(wallUuid: Uuid, scan: Scan | null): Promise<Picked | null> {
  const files = Platform.OS === 'web' ? await chooseFiles() : await chooseFromLibrary();
  if (files.length === 0) return null;

  const usable = files.flatMap((file) => {
    const extension = photoExtension(file.mimeType, file.fileName);
    return extension ? [{ uri: file.uri, width: file.width, height: file.height, extension }] : [];
  });
  let saved = scan;
  for (const photo of usable) {
    saved ??= createScan(wallUuid, 'upload', null);
    saved = await savePhoto(saved, photo, { takenAt: null, location: null, angle: null });
  }
  return { scan: saved, added: usable.length, skipped: files.length - usable.length };
}

/** Says why some picked files didn't make it into the scan. */
export function skippedText(skipped: number): string {
  return `${skipped === 1 ? '1 file was' : `${skipped} files were`} left out because only JPEG and HEIC photos can be used.`;
}

/** The phone's photo library. Quality 1 has iOS and Android copy each file as it is, HEIC and EXIF included. */
async function chooseFromLibrary(): Promise<PickedFile[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 0,
    orderedSelection: true,
    quality: 1,
  });
  return result.canceled ? [] : result.assets;
}

/**
 * The computer's file dialog, showing JPEG and HEIC files. expo-image-picker's
 * web version isn't used because it fails the whole pick when a file has no
 * MIME type, which is how Chrome on Windows often sees HEIC.
 */
function chooseFiles(): Promise<PickedFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/jpeg,image/heic,image/heif,.jpg,.jpeg,.heic,.heif';
    input.style.display = 'none';
    const done = (files: PickedFile[]) => {
      input.remove();
      resolve(files);
    };
    input.addEventListener('change', async () => done(await Promise.all([...(input.files ?? [])].map(readFile))));
    input.addEventListener('cancel', () => done([]));
    document.body.appendChild(input);
    input.click();
  });
}

/** A file as a blob URL, with its size if the browser can open it: 0 × 0 for a HEIC in most browsers. */
async function readFile(file: File): Promise<PickedFile> {
  const uri = URL.createObjectURL(file);
  const img = document.createElement('img');
  const size = await new Promise<{ width: number; height: number }>((done) => {
    img.onload = () => done({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => done({ width: 0, height: 0 });
    img.src = uri;
  });
  return { uri, ...size, mimeType: file.type, fileName: file.name };
}

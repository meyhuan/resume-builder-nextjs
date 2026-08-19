'use client';

import { useCallback, useState } from 'react';
import { track } from '@/lib/analytics';

type ParseJdImageResponse = {
  readonly text?: string;
  readonly error?: string;
};

async function compressScreenshot(file: File): Promise<File> {
  try {
    const isJpeg = file.type === 'image/jpeg' || file.type === 'image/jpg';
    if (file.size <= 4 * 1024 * 1024) {
      return file;
    }
    if (isJpeg && file.size <= 5 * 1024 * 1024) {
      return file;
    }

    const bitmap = await createImageBitmap(file);
    const maxSide = 2560;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.92);
    });
    if (!blob) return file;
    return new File([blob], 'jd-screenshot.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export function useParseJdImage() {
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState('');

  const clearError = useCallback((): void => {
    setError('');
  }, []);

  const parseImage = useCallback(async (file: File): Promise<string | null> => {
    setIsParsing(true);
    setError('');
    track('ai_assist_start', { feature: 'parse-jd-image' });
    try {
      const compressed = await compressScreenshot(file);
      const formData = new FormData();
      formData.append('file', compressed);
      const response = await fetch('/next-api/ai/parse-jd-image', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json() as ParseJdImageResponse;
      if (!response.ok || !data.text?.trim()) {
        const message = data.error || '截图识别失败，请稍后重试';
        setError(message);
        track('ai_assist_failed', { feature: 'parse-jd-image', error: message });
        return null;
      }
      track('ai_assist_success', { feature: 'parse-jd-image' });
      return data.text.trim();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : '截图识别失败，请稍后重试';
      setError(message);
      track('ai_assist_failed', { feature: 'parse-jd-image', error: message });
      return null;
    } finally {
      setIsParsing(false);
    }
  }, []);

  return { isParsing, error, parseImage, clearError };
}

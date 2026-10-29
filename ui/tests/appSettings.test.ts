import { expect, test } from 'vitest';
import { DEFAULT_APP_SETTINGS, validateAppSettings } from '../domain/appSettings';
test('FFmpeg paths preserve Windows separators and spaces and reject invalid control characters', () => {
  const path = 'C:\\Program Files\\FFmpeg\\bin\\ffmpeg.exe';
  expect(validateAppSettings({ ...DEFAULT_APP_SETTINGS, ffmpegPath: path }).ffmpegPath).toBe(path);
  expect(() => validateAppSettings({ ...DEFAULT_APP_SETTINGS, ffmpegPath: 'bad\0path' })).toThrow();
});

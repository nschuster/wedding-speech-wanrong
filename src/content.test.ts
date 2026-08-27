import { describe, expect, it } from 'vitest';
import speech from './speech.json';
import canonicalSource from './speech-source.txt?raw';

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();

describe('Wanrong speech content', () => {
  it('preserves the supplied speech exactly across 38 natural sections', () => {
    expect(speech).toHaveLength(38);
    expect(normalize(speech.map(section => section.source).join(' '))).toBe(normalize(canonicalSource));
  });

  it('contains aligned German, English, and Chinese text for every section', () => {
    speech.forEach((section, index) => {
      expect(section.id).toBe(index + 1);
      expect(section.de.trim()).not.toBe('');
      expect(section.en.trim()).not.toBe('');
      expect(section.zh.trim()).not.toBe('');
    });

    expect(speech[0].en).toContain('Good evening, everyone.');
    expect(speech[0].de).toContain('Guten Abend zusammen.');
    expect(speech[0].zh).toContain('大家晚上好');
    expect(speech[26].zh).toContain('爸爸妈妈，还有姐姐');
    expect(speech[30].de).toContain('Liebe Claudia, lieber Rene');
    expect(speech[37].en).toBe('Cheers!');
    expect(speech[37].de).toBe('Zum Wohl!');
    expect(speech[37].zh).toBe('干杯！');
  });

  it('does not reuse groom-speech photos for Wanrong’s speech', () => {
    speech.forEach(section => expect(section).not.toHaveProperty('image'));
  });
});

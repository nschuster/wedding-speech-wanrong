import { describe, expect, it } from 'vitest';
import speech from './speech.json';

describe('speech content', () => {
  it('contains the complete 28-section wedding speech in all three languages', () => {
    expect(speech).toHaveLength(28);

    speech.forEach((section, index) => {
      expect(section.id).toBe(index + 1);
      expect(section.de.trim()).not.toBe('');
      expect(section.en.trim()).not.toBe('');
      expect(section.zh.trim()).not.toBe('');
    });

    expect(speech[0].de).toBe('Liebe Familie, liebe Freunde, liebe Gäste,');
    expect(speech[27].de).toContain('Auf uns!');
    expect(speech.map(section => section.de).join(' ')).toContain('unser Wochenendtrip nach Paris, bei dem wir uns verlobt haben');
    expect(speech.map(section => section.de).join(' ')).toContain('den Feldberg zum elften oder zwölften Mal hochzuwandern');
  });

  it('allows selected sections to declare optional background images', () => {
    expect(speech[13]).toMatchObject({
      image: 'images/cooking-together.webp',
      imagePosition: '40% 35%'
    });
    expect(speech[14]).toMatchObject({
      image: 'images/cooking-together.webp',
      imagePosition: '40% 35%'
    });
    expect(speech[15]).toMatchObject({
      image: 'images/cow-hike.webp',
      imagePosition: 'center'
    });
    expect(speech[16]).toMatchObject({
      image: 'images/dandelions.webp',
      imagePosition: '60% center'
    });
    expect(speech[17]).toMatchObject({
      image: 'images/koenigssee.webp',
      imagePosition: 'center',
      imageFit: 'cover'
    });
    expect(speech[18]).toMatchObject({
      image: 'images/venice-canal.webp',
      imagePosition: '82% center',
      imageFit: 'cover'
    });
    expect(speech[19]).toMatchObject({
      image: 'images/paris.webp',
      imagePosition: 'center',
      imageFit: 'cover'
    });
  });
});

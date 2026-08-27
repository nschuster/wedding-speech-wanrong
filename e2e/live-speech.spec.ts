import { expect, test } from '@playwright/test';

test('German, English and Chinese guests follow presenter and reconnect to current section', async ({ browser }) => {
  const context = await browser.newContext();
  const german = await context.newPage(); const english = await context.newPage(); const chinese = await context.newPage(); const presenter = await context.newPage();
  await german.goto('/?lang=de'); await english.goto('/?lang=en'); await chinese.goto('/?lang=zh'); await presenter.goto('/presenter/');
  await expect(german.getByRole('heading', { name: 'Willkommen' })).toBeVisible();
  await expect(english.getByRole('heading', { name: 'Welcome' })).toBeVisible();
  await expect(chinese.getByRole('heading', { name: '欢迎' })).toBeVisible();
  await expect(presenter.getByRole('img', { name: /QR code for guest view/i })).toBeVisible();
  await presenter.keyboard.press('ArrowRight');
  await expect(german.getByText(/Liebe Familie, liebe Freunde/i)).toBeVisible(); await expect(english.getByText(/Dear family, dear friends/i)).toBeVisible(); await expect(chinese.getByText(/亲爱的家人、朋友们/)).toBeVisible();
  await english.close();
  await presenter.keyboard.press('ArrowRight'); await presenter.keyboard.press('ArrowRight');
  const reconnected = await context.newPage(); await reconnected.goto('/?lang=en');
  await expect(reconnected.getByText(/quite nervous about giving this speech/i)).toBeVisible();
  await context.close();
});

test('guest view fits a phone viewport without page scrolling', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Deutsch' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'English' })).toBeVisible();
  await expect(page.getByRole('button', { name: '中文' })).toBeVisible();
  const sizes = await page.evaluate(() => ({ viewport: document.documentElement.clientHeight, content: document.documentElement.scrollHeight }));
  expect(sizes.content).toBeLessThanOrEqual(sizes.viewport + 1);
});

test('presenter toolbar controls do not overlap', async ({ page }) => {
  await page.goto('/presenter/');
  const controls = page.locator('.presenter-tools > *');
  const boxes = await controls.evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect();
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
  }));

  for (let first = 0; first < boxes.length; first += 1) {
    for (let second = first + 1; second < boxes.length; second += 1) {
      const a = boxes[first]; const b = boxes[second];
      const overlaps = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      expect(overlaps, `toolbar controls ${first} and ${second} overlap`).toBe(false);
    }
  }
});

test('every translated speech section fits the guest viewport', async ({ browser }) => {
  const context = await browser.newContext();
  const guest = await context.newPage();
  const presenter = await context.newPage();
  await guest.goto('/?lang=zh');
  await presenter.goto('/presenter/');

  for (let section = 1; section <= 28; section += 1) {
    await presenter.getByRole('combobox', { name: /Jump to section/i }).selectOption(String(section));
    await expect(guest.locator('.progress')).toHaveAttribute('aria-label', `Section ${section} of 28`);
    const sizes = await guest.evaluate(() => ({ viewport: document.documentElement.clientHeight, content: document.documentElement.scrollHeight }));
    expect(sizes.content, `section ${section}`).toBeLessThanOrEqual(sizes.viewport + 1);
  }

  await context.close();
});

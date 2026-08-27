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
  await expect(german.getByText(/Guten Abend zusammen/i)).toBeVisible(); await expect(english.getByText(/Good evening, everyone/i)).toBeVisible(); await expect(chinese.getByText(/大家晚上好/)).toBeVisible();
  await english.close();
  await presenter.getByRole('combobox', { name: /Jump to section/i }).selectOption('5');
  await expect(german.locator('.progress')).toHaveAttribute('aria-label', 'Section 5 of 38');
  const reconnected = await context.newPage(); await reconnected.goto('/?lang=en');
  await expect(reconnected.getByRole('status')).toHaveText(/Connected/, { timeout: 30000 });
  await expect(reconnected.getByText(/at the centre of all this is Niklas/i)).toBeVisible({ timeout: 30000 });
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
  await expect(page.getByRole('combobox', { name: 'Presenter language' })).toHaveValue('en');
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
  for (const language of ['de', 'en', 'zh']) {
    const context = await browser.newContext();
    const guest = await context.newPage();
    await guest.goto(`/?lang=${language}`);

    for (let section = 1; section <= 38; section += 1) {
      await guest.evaluate(currentSection => {
        const key = 'wedding-speech-demo-state:speeches/wanrong/live';
        const value = JSON.stringify({ currentSection, updatedAt: Date.now() });
        localStorage.setItem(key, value);
        window.dispatchEvent(new StorageEvent('storage', { key, newValue: value }));
      }, section);
      await expect(guest.locator('.progress')).toHaveAttribute('aria-label', `Section ${section} of 38`);
      const size = await guest.evaluate(() => ({
        viewport: document.documentElement.clientHeight,
        content: document.documentElement.scrollHeight,
      }));
      expect(size.content, `${language} section ${section}`).toBeLessThanOrEqual(size.viewport + 1);
    }

    await context.close();
  }
});

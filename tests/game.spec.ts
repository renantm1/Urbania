import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { cellClick, start } from './helpers';

async function manualSave(page: Page) {
  await page.getByRole('button', { name: 'Salvamentos', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar aqui', exact: true }).first().click();
  await expect(page.getByRole('status')).toContainText('Cidade salva');
}

test('cidade jogável: obras, crescimento, orçamento, exportação e recuperação após reload', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await start(page);
  await expect(page.getByTestId('population')).toHaveText('0');
  await cellClick(page, 16, 20); await cellClick(page, 32, 20);
  await expect(page.getByTestId('treasury')).toHaveText('R$ 1,98 mi');
  await page.getByTestId('tool-residential').click();
  for (let x = 17; x <= 25; x++) await cellClick(page, x, 19);
  await page.getByTestId('tool-commercial').click();
  for (let x = 18; x <= 21; x++) await cellClick(page, x, 21);
  await page.getByTestId('tool-industrial').click();
  for (let x = 29; x <= 31; x++) await cellClick(page, x, 21);
  await page.getByRole('button', { name: 'Velocidade 4x' }).click();
  await expect.poll(async () => Number((await page.getByTestId('population').innerText()).replace(/\./g, '')), { timeout: 25_000 }).toBeGreaterThan(15);
  await page.getByRole('button', { name: 'Pausar simulação', exact: true }).click();
  const pop = await page.getByTestId('population').innerText();
  await page.getByTestId('tool-select').click();
  await page.screenshot({ path: info.outputPath('gameplay.png') });
  await page.getByRole('button', { name: 'Orçamento', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('slider', { name: 'Alíquota de impostos' }).fill('12');
  await expect(page.getByRole('dialog')).toContainText('12%');
  await page.getByRole('button', { name: 'Fechar janela' }).click();
  await manualSave(page);
  const data = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('urbania', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    return new Promise<{ city: { roads: Record<string, unknown>; lots: Record<string, unknown>; taxRate: number } }>((resolve, reject) => { const r = db.transaction('cities').objectStore('cities').get('slot-1'); r.onsuccess = () => { resolve(r.result); db.close(); }; r.onerror = () => reject(r.error); });
  });
  expect(Object.keys(data.city.roads)).toHaveLength(17);
  expect(Object.keys(data.city.lots)).toHaveLength(16);
  expect(data.city.taxRate).toBe(12);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar JSON' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('urbania-aurora-do-vale.json');
  const savePath = info.outputPath('city.json');
  await download.saveAs(savePath);
  await page.reload();
  await page.getByRole('button', { name: 'Continuar Aurora do Vale' }).click();
  await expect(page.getByTestId('population')).toHaveText(pop);
  await expect(page.getByRole('button', { name: 'Continuar simulação', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Salvamentos', exact: true }).click();
  await page.getByLabel('Arquivo JSON da cidade').setInputFiles(savePath);
  await expect(page.getByRole('status')).toContainText('Cidade importada');
  await expect(page.getByTestId('population')).toHaveText(pop);
  expect(errors).toEqual([]);
});

test('demolição, cancelamento, pausa e atalhos funcionam no canvas real', async ({ page }) => {
  await start(page);
  await cellClick(page, 20, 20); await cellClick(page, 24, 20);
  await page.keyboard.press('5');
  await expect(page.getByTestId('tool-bulldoze')).toHaveAttribute('aria-pressed', 'true');
  await cellClick(page, 22, 20);
  await page.keyboard.press('v'); await cellClick(page, 22, 20);
  await expect(page.locator('.selection-card')).toContainText('Terreno livre');
  await page.keyboard.press('Escape');
  await expect(page.locator('.selection-card')).not.toBeVisible();
  await page.keyboard.press('1'); await cellClick(page, 24, 20);
  await expect(page.locator('.tool-heading')).toContainText('ponto final');
  await page.keyboard.press('Escape');
  await expect(page.locator('.tool-heading')).toContainText('início');
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Pausar simulação', exact: true })).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Continuar simulação', exact: true })).toBeVisible();
  await page.keyboard.press('Control+Shift+s');
  await expect(page.getByRole('dialog')).toContainText('SALVAMENTOS LOCAIS');
});

test('importação rejeita arquivo inválido sem substituir a cidade atual', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Salvamentos', exact: true }).click();
  await page.getByLabel('Arquivo JSON da cidade').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"version":99}') });
  await expect(page.getByRole('alert')).toContainText('save JSON válido');
  await page.getByRole('button', { name: 'Fechar janela' }).click();
  await expect(page.locator('.city-identity')).toContainText('Aurora do Vale');
  await expect(page.getByTestId('treasury')).toHaveText('R$ 2,00 mi');
});

test('autosave salva após um minuto e pode ser desativado nas configurações', async ({ page }) => {
  // Use real time: mocking requestAnimationFrame interferes with WebGL's render loop
  // and Playwright's actionability checks after large virtual-time jumps.
  test.setTimeout(240_000);
  await start(page);
  const hasAutosave = () => page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('urbania', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    return new Promise<boolean>((resolve, reject) => { const r = db.transaction('cities').objectStore('cities').get('autosave'); r.onsuccess = () => { resolve(!!r.result); db.close(); }; r.onerror = () => reject(r.error); });
  });
  await expect.poll(hasAutosave, { timeout: 70_000, intervals: [1000] }).toBe(true);
  await page.getByRole('button', { name: 'Salvamentos', exact: true }).click();
  const automatic = page.locator('.save-slot').filter({ hasText: 'SALVAMENTO AUTOMÁTICO' });
  await expect(automatic).toContainText('Aurora do Vale');
  await page.getByRole('button', { name: 'Excluir autosave' }).click();
  await page.getByRole('button', { name: 'Sim, excluir' }).click();
  await expect(automatic).toContainText('Nenhuma cidade salva');
  await page.getByRole('button', { name: 'Fechar janela' }).click();
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Salvamento automático' }).uncheck();
  await page.getByRole('button', { name: 'Fechar janela' }).click();
  // Wait a full autosave interval with the option disabled, then check actual storage.
  await page.waitForTimeout(61_000);
  expect(await hasAutosave()).toBe(false);
  await page.getByRole('button', { name: 'Salvamentos', exact: true }).click();
  await expect(automatic).toContainText('Nenhuma cidade salva');
});

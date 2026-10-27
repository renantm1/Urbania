import { expect, test } from '@playwright/test';
import { cellClick, cellHover, readSlot, start } from './helpers';
import { getMetrics } from '../src/core/simulation';
import { createCity } from '../src/core/world';
import { developedCity } from '../src/core/__tests__/fixtures';

test('bairro misto cresce, permite inspecionar os dois usos e persiste após recarregar', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await start(page);
  await cellClick(page, 20, 20); await cellClick(page, 30, 20);
  await page.keyboard.press('6');
  await expect(page.getByTestId('tool-mixed')).toHaveAttribute('aria-pressed', 'true');
  await cellClick(page, 23, 19);
  await page.getByRole('button', { name: 'Velocidade 4x' }).click();
  await expect.poll(async () => Number(await page.getByTestId('population').innerText()), { timeout: 25_000 }).toBeGreaterThan(2);
  await page.getByRole('button', { name: 'Pausar simulação', exact: true }).click();
  await page.keyboard.press('v'); await cellClick(page, 23, 19);
  await expect(page.locator('.selection-card')).toContainText('Edifício de uso misto');
  await expect(page.locator('.selection-card')).toContainText('Trabalhadores no térreo');
  await page.keyboard.press('Control+s'); await expect(page.getByRole('status')).toContainText('Cidade salva');
  const city = await readSlot(page);
  expect(city.version).toBe(3); expect(city.lots['23,19'].building!.workers).toBeGreaterThan(0);
  expect(getMetrics(city).jobs).toBe(4); expect(getMetrics(city).taxes.commercial).toBeGreaterThan(0);
  await page.screenshot({ path: info.outputPath('bairro-misto.png') });
  await page.reload(); await page.getByRole('button', { name: 'Continuar Aurora do Vale' }).click();
  await expect(page.getByTestId('population')).toHaveText(String(getMetrics(city).population));
  await cellClick(page, 23, 19);
  await expect(page.locator('.selection-card')).toContainText('Edifício de uso misto');
  expect(errors).toEqual([]);
});

test('prévia avisa sobre instalação sem acesso e calcula só os lotes elegíveis do pincel', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Energia e água', exact: true }).click();
  await page.locator('.facility-card').filter({ hasText: 'Subestação elétrica' }).getByRole('button', { name: /^Construir/ }).click();
  await cellHover(page, 23, 19);
  await expect(page.getByTestId('build-preview')).toContainText('ao lado de uma rua');
  await cellClick(page, 23, 19); await expect(page.getByRole('alert')).toContainText('ao lado de uma rua');
  await page.keyboard.press('1'); await cellClick(page, 20, 20); await cellClick(page, 30, 20);
  await page.keyboard.press('6'); await cellClick(page, 23, 19);
  await page.getByRole('button', { name: 'Pincel 3 por 3', exact: true }).click();
  await cellHover(page, 23, 19);
  await expect(page.getByTestId('build-preview')).toContainText('5 lotes a zonear');
  await expect(page.getByTestId('build-preview')).toContainText('600');
  await cellClick(page, 23, 19);
  await page.keyboard.press('Control+s'); await expect(page.getByRole('status')).toContainText('Cidade salva');
  expect(Object.keys((await readSlot(page)).lots)).toHaveLength(6);
});

test('guia responde às obras; preferências persistem e configurações reabrem o guia', async ({ page }) => {
  await start(page);
  await expect(page.getByTestId('guide-current')).toHaveText('Tudo começa com uma rua.');
  await cellClick(page, 20, 20); await cellClick(page, 30, 20);
  await expect(page.getByTestId('guide-current')).toHaveText('Abra espaço para morar.');
  await page.getByRole('button', { name: 'Zonear moradias', exact: true }).click();
  await expect(page.getByTestId('tool-residential')).toHaveAttribute('aria-pressed', 'true');
  for (const x of [21, 22, 23, 24]) await cellClick(page, x, 19);
  await expect(page.getByTestId('guide-current')).toHaveText('Um bairro precisa de trabalho.');
  await page.getByRole('button', { name: 'Ocultar guia de primeiros passos' }).click();
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Sons de construção e eventos' }).check();
  await page.getByRole('checkbox', { name: 'Modo de desempenho', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Salvamento automático' }).uncheck();
  await page.reload();
  await page.getByRole('button', { name: 'Começar a construir' }).click();
  await expect(page.getByRole('region', { name: 'Guia de primeiros passos' })).not.toBeVisible();
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Salvamento automático' })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Sons de construção e eventos' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Modo de desempenho', exact: true })).toBeChecked();
  await page.getByRole('checkbox', { name: 'Guia de primeiros passos', exact: true }).check();
  await page.getByRole('button', { name: 'Fechar janela' }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByTestId('guide-current')).toBeVisible();
});

test('save da versão 2 preserva redes, políticas, caixa e edifícios ao migrar para 3', async ({ page }) => {
  await start(page);
  const city = { ...developedCity(), version: 2, name: 'Bairro anterior', policies: { ...createCity().policies, recycling: true } };
  await page.getByRole('button', { name: 'Salvamentos', exact: true }).click();
  await page.getByLabel('Arquivo JSON da cidade').setInputFiles({ name: 'version-2.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(city)) });
  await expect(page.locator('.city-identity')).toContainText('Bairro anterior');
  await page.keyboard.press('Control+s'); await expect(page.getByRole('status')).toContainText('Cidade salva');
  expect(await readSlot(page)).toEqual({ ...city, version: 3 });
});

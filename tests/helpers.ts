import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';
import type { City } from '../src/core/types';

export async function cellClick(page: Page, x: number, z: number) {
  const bounds = await page.locator('canvas').boundingBox();
  if (!bounds) throw new Error('Canvas não encontrado');
  const camera = new PerspectiveCamera(42, bounds.width / bounds.height, 1, 1600);
  camera.position.set(190, 240, 285); camera.lookAt(-26, 0, -6); camera.updateMatrixWorld();
  const p = new Vector3((x - 27.5) * 8, .35, (z - 27.5) * 8).project(camera);
  await page.mouse.click(bounds.x + (p.x + 1) * bounds.width / 2, bounds.y + (1 - p.y) * bounds.height / 2);
}

export async function start(page: Page) {
  await page.goto('./');
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByLabel('COMO VAI SE CHAMAR SUA CIDADE?').fill('Aurora do Vale');
  await page.getByRole('button', { name: 'Começar a construir' }).click();
  await page.getByRole('button', { name: 'Pausar simulação', exact: true }).click();
  await page.waitForTimeout(500);
}

export async function readSlot(page: Page, slot = 'slot-1'): Promise<City> {
  return page.evaluate(async slot => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('urbania', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    return new Promise<City>((resolve, reject) => { const r = db.transaction('cities').objectStore('cities').get(slot); r.onsuccess = () => { resolve(r.result.city); db.close(); }; r.onerror = () => reject(r.error); });
  }, slot);
}

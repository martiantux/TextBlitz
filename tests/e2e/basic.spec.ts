import { test, expect } from '@playwright/test';

test.describe('Basic Functionality', () => {
  test('should load test page', async ({ page }) => {
    await page.goto('https://example.com');
    await expect(page).toHaveTitle(/Example Domain/);
  });

  test('should create and render input element', async ({ page }) => {
    await page.goto('data:text/html,<html><body><input id="test" type="text" /></body></html>');

    const input = page.locator('#test');
    await expect(input).toBeVisible();

    await input.fill('Hello World');
    await expect(input).toHaveValue('Hello World');
  });

  test('should handle contenteditable', async ({ page }) => {
    await page.goto('data:text/html,<html><body><div id="editor" contenteditable="true">Type here</div></body></html>');

    const editor = page.locator('#editor');
    await expect(editor).toBeVisible();

    await editor.click();
    await page.keyboard.type(' test');

    const text = await editor.textContent();
    expect(text).toContain('test');
  });
});

import { expect, type Locator, type Page } from '@playwright/test';
import { ContinueBar } from '@app/components/ContinueBar';
import { Step } from '@app/utils/step';

export class ExecutorPicker {
  private readonly root: Locator;
  readonly continueBar: ContinueBar;

  constructor(private readonly page: Page) {
    this.root = page.locator('app-employee');
    this.continueBar = new ContinueBar(this.root);
  }

  private masterCard(name: string): Locator {
    return this.page.locator('app-short-info-card').filter({ hasText: name });
  }

  @Step((name: string) => `Select master "${name}"`)
  async selectByName(name: string): Promise<void> {
    const card = this.masterCard(name);
    await expect(card).toBeVisible();
    await card.click();
  }
}

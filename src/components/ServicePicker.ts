import { expect, type Locator, type Page } from '@playwright/test';
import { ContinueBar } from '@app/components/ContinueBar';
import { Step } from '@app/utils/step';

export class ServicePicker {
  private readonly root: Locator;
  readonly continueBar: ContinueBar;

  constructor(private readonly page: Page) {
    this.root = page.locator('app-services');
    this.continueBar = new ContinueBar(this.root);
  }

  private serviceCard(name: string): Locator {
    return this.page.locator('app-short-info-card').filter({ hasText: name });
  }

  @Step((name: string) => `Select service "${name}"`)
  async selectByName(name: string): Promise<void> {
    const card = this.serviceCard(name);
    await expect(card).toBeVisible();
    await card.getByRole('button').click();
  }
}

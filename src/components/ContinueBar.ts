import type { Locator } from '@playwright/test';
import { Step } from '@app/utils/step';

export type ContinueLabel = 'Послуги' | 'Виконавець' | 'Дата та час' | 'Продовжити';

export class ContinueBar {
  constructor(private readonly root: Locator) {}

  @Step((label: ContinueLabel) => `Continue to "${label}"`)
  async goTo(label: ContinueLabel): Promise<void> {
    await this.root
      .locator('app-animated-continue-button')
      .getByText(label, { exact: true })
      .click();
  }
}

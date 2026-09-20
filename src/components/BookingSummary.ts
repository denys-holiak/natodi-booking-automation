import type { Locator, Page } from '@playwright/test';
import { Step } from '@app/utils/step';

export class BookingSummary {
  readonly heading: Locator;
  readonly selectedServiceChips: Locator;
  readonly selectedExecutor: Locator;
  readonly selectedDate: Locator;
  readonly selectedTime: Locator;
  private readonly confirmButton: Locator;

  constructor(page: Page) {
    const root = page.locator('app-home');
    this.heading = root.getByText('Ваш запис', { exact: true });
    this.selectedServiceChips = root.locator('app-services-data-card .svc-chip');
    this.selectedExecutor = root.locator('app-employee-data-card .val');
    this.selectedDate = root.locator('app-date-data-card .val');
    this.selectedTime = root.locator('app-date-data-card .sub');
    this.confirmButton = root.getByRole('button', { name: 'Продовжити' });
  }

  @Step('Confirm the summary and continue to contact details')
  async continueToContactForm(): Promise<void> {
    await this.confirmButton.click();
  }
}

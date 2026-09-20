import type { Locator, Page } from '@playwright/test';
import { BookingSummary } from '@app/components/BookingSummary';
import { ContactForm } from '@app/components/ContactForm';
import { ExecutorPicker } from '@app/components/ExecutorPicker';
import { ServicePicker } from '@app/components/ServicePicker';
import { SlotPicker } from '@app/components/SlotPicker';
import { BOOKING_URL } from '@app/config/env';
import { Step } from '@app/utils/step';

export class BookingWidget {
  private readonly servicePickButton: Locator;
  private readonly executorPickButton: Locator;
  readonly executorPicker: ExecutorPicker;
  readonly servicePicker: ServicePicker;
  readonly slotPicker: SlotPicker;
  readonly bookingSummary: BookingSummary;
  readonly contactForm: ContactForm;

  constructor(private readonly page: Page) {
    const home = page.locator('app-home');
    this.servicePickButton = home.getByText('Оберіть послуги', { exact: true });
    this.executorPickButton = home.getByText('Оберіть майстра', { exact: true });
    this.executorPicker = new ExecutorPicker(page);
    this.servicePicker = new ServicePicker(page);
    this.slotPicker = new SlotPicker(page);
    this.bookingSummary = new BookingSummary(page);
    this.contactForm = new ContactForm(page);
  }

  async goto(): Promise<void> {
    await this.page.goto(BOOKING_URL);
  }

  @Step('Open the service picker')
  async openServicePicker(): Promise<void> {
    await this.servicePickButton.click();
  }

  @Step('Open the executor picker')
  async openExecutorPicker(): Promise<void> {
    await this.executorPickButton.click();
  }
}

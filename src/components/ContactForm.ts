import type { Locator, Page } from '@playwright/test';
import { Step } from '@app/utils/step';

export interface ContactDetails {
  firstName?: string;
  lastName?: string;
  phoneDigits?: string;
  email?: string;
  instagram?: string;
  telegram?: string;
}

function byFormControlName(root: Locator, formControlName: string): Locator {
  return root.locator(
    `app-input[formcontrolname="${formControlName}"] input, input[formcontrolname="${formControlName}"]`,
  );
}

export class ContactForm {
  private readonly firstNameInput: Locator;
  private readonly lastNameInput: Locator;
  private readonly phoneInput: Locator;
  private readonly emailInput: Locator;
  private readonly instagramInput: Locator;
  private readonly telegramInput: Locator;
  readonly submitButton: Locator;
  readonly phoneErrorMessage: Locator;
  readonly confirmationHeading: Locator;

  constructor(private readonly page: Page) {
    const root = page.locator('app-confirmation');
    this.firstNameInput = byFormControlName(root, 'first_name');
    this.lastNameInput = byFormControlName(root, 'last_name');
    this.phoneInput = byFormControlName(root, 'phone_number');
    this.emailInput = byFormControlName(root, 'email');
    this.instagramInput = byFormControlName(root, 'instagram');
    this.telegramInput = byFormControlName(root, 'telegram');
    this.submitButton = root.getByRole('button', { name: 'Записатись' });
    this.phoneErrorMessage = root.getByText('Невірно введений номер');
    // Scoped to the page, not `root` - Angular swaps in a different root
    // element for the confirmed state, so `app-confirmation` no longer
    // exists once the booking succeeds.
    this.confirmationHeading = page.locator('.success-moment .title');
  }

  async fillFirstName(firstName: string): Promise<void> {
    await this.firstNameInput.fill(firstName);
  }

  async fillLastName(lastName: string): Promise<void> {
    await this.lastNameInput.fill(lastName);
  }

  async fillPhoneNumber(phoneDigits: string): Promise<void> {
    await this.phoneInput.click();
    await this.page.keyboard.press('ControlOrMeta+A');
    await this.page.keyboard.press('Backspace');
    await this.phoneInput.pressSequentially(phoneDigits);
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async fillInstagram(instagram: string): Promise<void> {
    await this.instagramInput.fill(instagram);
  }

  async fillTelegram(telegram: string): Promise<void> {
    await this.telegramInput.fill(telegram);
  }

  @Step('Fill in contact details')
  async fill({
    firstName,
    lastName,
    phoneDigits,
    email,
    instagram,
    telegram,
  }: ContactDetails): Promise<void> {
    if (firstName !== undefined) {
      await this.fillFirstName(firstName);
    }
    if (lastName !== undefined) {
      await this.fillLastName(lastName);
    }
    if (phoneDigits) {
      await this.fillPhoneNumber(phoneDigits);
    }
    if (email) {
      await this.fillEmail(email);
    }
    if (instagram) {
      await this.fillInstagram(instagram);
    }
    if (telegram) {
      await this.fillTelegram(telegram);
    }
  }

  @Step('Submit the booking')
  async submit(): Promise<void> {
    await this.submitButton.click();
  }
}

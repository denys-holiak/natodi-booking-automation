import { expect, test } from '@app/fixtures';
import { BOOKING_MASTER_NAME, BOOKING_SERVICE_NAME } from '@app/config/env';

test.describe('Booking - Negative', () => {
  test.beforeEach(async ({ bookingWidget }) => {
    await bookingWidget.openServicePicker();
    await bookingWidget.servicePicker.selectByName(BOOKING_SERVICE_NAME);
    await bookingWidget.servicePicker.continueBar.goTo('Виконавець');

    await bookingWidget.executorPicker.selectByName(BOOKING_MASTER_NAME);
    await bookingWidget.executorPicker.continueBar.goTo('Дата та час');

    await bookingWidget.slotPicker.selectNextAvailableSlot();
    await bookingWidget.slotPicker.continueBar.goTo('Продовжити');
    await bookingWidget.bookingSummary.continueToContactForm();
  });

  test('should reject booking with an incomplete phone number', async ({
    bookingWidget,
    contactBuilder,
  }) => {
    await bookingWidget.contactForm.fill(contactBuilder.build({ phoneDigits: '0991234' }));
    await expect(bookingWidget.contactForm.phoneErrorMessage).toBeVisible();
    await expect(bookingWidget.contactForm.submitButton).toBeDisabled();
  });

  test('should reject booking with a missing required name', async ({
    bookingWidget,
    contactBuilder,
  }) => {
    await bookingWidget.contactForm.fill(contactBuilder.build({ firstName: '' }));
    // Unlike the phone field, the widget renders no inline error text for
    // a blank required name (only the "*" marker) - confirmed by hand, not
    // assumed - so the disabled submit button is the only assertable signal.
    await expect(bookingWidget.contactForm.submitButton).toBeDisabled();
  });
});

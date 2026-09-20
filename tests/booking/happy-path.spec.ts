import { expect, test } from '@app/fixtures';
import { BOOKING_MASTER_NAME, BOOKING_SERVICE_NAME } from '@app/config/env';

test.describe('Booking', () => {
  test('should book a service successfully with a chosen master, slot and full contact details', async ({
    bookingWidget,
    contactBuilder,
  }) => {
    await bookingWidget.openServicePicker();
    await bookingWidget.servicePicker.selectByName(BOOKING_SERVICE_NAME);
    await bookingWidget.servicePicker.continueBar.goTo('Виконавець');

    await bookingWidget.executorPicker.selectByName(BOOKING_MASTER_NAME);
    await bookingWidget.executorPicker.continueBar.goTo('Дата та час');

    const slot = await bookingWidget.slotPicker.selectNextAvailableSlot();
    await bookingWidget.slotPicker.continueBar.goTo('Продовжити');

    await test.step('verify the summary reflects the selected service, master and slot', async () => {
      await expect(bookingWidget.bookingSummary.selectedServiceChips).toHaveText([
        BOOKING_SERVICE_NAME,
      ]);
      await expect(bookingWidget.bookingSummary.selectedExecutor).toHaveText(BOOKING_MASTER_NAME);
      await expect(bookingWidget.bookingSummary.selectedDate).toContainText(slot.day);
      await expect(bookingWidget.bookingSummary.selectedTime).toHaveText(slot.time);
    });

    await bookingWidget.bookingSummary.continueToContactForm();
    await bookingWidget.contactForm.fill(contactBuilder.build());

    await test.step(`submit the booking for day ${slot.day} at ${slot.time}`, async () => {
      await bookingWidget.contactForm.submit();
      await expect(bookingWidget.contactForm.confirmationHeading).toBeVisible();
    });
  });
});

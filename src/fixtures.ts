/* eslint-disable no-empty-pattern */
import { test as base } from '@playwright/test';
import { ContactBuilder } from '@app/data/contactBuilder';
import { BookingWidget } from '@app/pages/BookingWidget';

export const test = base.extend<{
  bookingWidget: BookingWidget;
  contactBuilder: ContactBuilder;
}>({
  bookingWidget: async ({ page }, use) => {
    const widget = new BookingWidget(page);
    await widget.goto();
    await use(widget);
  },

  contactBuilder: async ({}, use) => {
    await use(new ContactBuilder());
  },
});

export const expect = test.expect;

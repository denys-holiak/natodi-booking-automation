/* eslint-disable no-empty-pattern */
import { test as base } from '@playwright/test';
import { PlatziApiClient } from '@app/api/PlatziApiClient';
import { ContactBuilder } from '@app/data/contactBuilder';
import { ProductBuilder } from '@app/data/productBuilder';
import { BookingWidget } from '@app/pages/BookingWidget';

export const test = base.extend<{
  bookingWidget: BookingWidget;
  contactBuilder: ContactBuilder;
  apiClient: PlatziApiClient;
  productBuilder: ProductBuilder;
}>({
  bookingWidget: async ({ page }, use) => {
    const widget = new BookingWidget(page);
    await widget.goto();
    await use(widget);
  },

  contactBuilder: async ({}, use) => {
    await use(new ContactBuilder());
  },

  apiClient: async ({ request }, use) => {
    await use(new PlatziApiClient(request));
  },

  productBuilder: async ({}, use) => {
    await use(new ProductBuilder());
  },
});

export const expect = test.expect;

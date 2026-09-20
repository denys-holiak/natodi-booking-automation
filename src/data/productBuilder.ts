import { faker } from '@faker-js/faker';
import type { CreateProductPayload } from '@app/api/PlatziApiClient';

// Category 1 ("Clothes") is one of this API's own built-in seed
// categories, always present - see NOTES.md for why API tests lean on
// stable seed data like this instead of creating their own.
const SEEDED_CATEGORY_ID = 1;

export class ProductBuilder {
  build(overrides: Partial<CreateProductPayload> = {}): CreateProductPayload {
    return {
      title: faker.commerce.productName(),
      price: faker.number.int({ min: 1, max: 999 }),
      description: faker.commerce.productDescription(),
      categoryId: SEEDED_CATEGORY_ID,
      images: ['https://placehold.co/600x400'],
      ...overrides,
    };
  }
}

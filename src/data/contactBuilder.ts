import { faker } from '@faker-js/faker';
import type { ContactDetails } from '@app/components/ContactForm';

const MOBILE_OPERATOR_CODES = ['67', '68', '96', '97', '98', '50', '66', '95', '99', '63', '73'];

export class ContactBuilder {
  build(overrides: Partial<ContactDetails> = {}): Required<ContactDetails> {
    const operatorCode = faker.helpers.arrayElement(MOBILE_OPERATOR_CODES);
    const subscriberNumber = faker.string.numeric(7);

    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phoneDigits: `0${operatorCode}${subscriberNumber}`,
      email: faker.internet.email(),
      instagram: faker.internet.username(),
      telegram: faker.internet.username(),
      ...overrides,
    };
  }
}

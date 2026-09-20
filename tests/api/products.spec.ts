import { expect, test } from '@app/fixtures';
import { productSchema } from '@app/api/schemas/product.schema';
import { ajv } from '@app/api/schemas/validator';

// One of this API's own built-in seeded products - always present, so
// it's safe to assume it exists without creating it first (unlike the
// product the create/read/delete test makes for itself). See NOTES.md.
const SEEDED_PRODUCT_ID = 1;
const NON_EXISTENT_PRODUCT_ID = 999999999;

test.describe('Products API', () => {
  test('should retrieve a seeded product successfully with a valid ID', async ({ apiClient }) => {
    const { status, body } = await apiClient.getProduct(SEEDED_PRODUCT_ID);

    expect(status).toBe(200);
    expect(body.id).toBe(SEEDED_PRODUCT_ID);
    expect(body.title).toBeTruthy();
  });

  test('should fail to retrieve a product with a non-existent ID', async ({ apiClient }) => {
    const { status } = await apiClient.getProduct(NON_EXISTENT_PRODUCT_ID);

    // This API reports a missing entity as 400 (EntityNotFoundError), not
    // a classic REST 404 - confirmed against the live API, not assumed.
    expect(status).toBe(400);
  });

  test('should return a product matching the expected schema', async ({ apiClient }) => {
    const { body } = await apiClient.getProduct(SEEDED_PRODUCT_ID);

    const validate = ajv.compile(productSchema);
    const isValid = validate(body);

    expect(isValid, isValid ? undefined : ajv.errorsText(validate.errors)).toBe(true);
  });

  test('should create, read back and delete a product', async ({ apiClient, productBuilder }) => {
    const payload = productBuilder.build();
    const created = await apiClient.createProduct(payload);
    expect(created.status).toBe(201);

    await test.step('the created product is readable by its own ID', async () => {
      const fetched = await apiClient.getProduct(created.body.id);
      expect(fetched.status).toBe(200);
      expect(fetched.body.title).toBe(payload.title);
    });

    await test.step('deleting it removes it for good', async () => {
      const deleted = await apiClient.deleteProduct(created.body.id);
      expect(deleted.status).toBe(200);

      const fetchedAfterDelete = await apiClient.getProduct(created.body.id);
      expect(fetchedAfterDelete.status).toBe(400);
    });
  });
});

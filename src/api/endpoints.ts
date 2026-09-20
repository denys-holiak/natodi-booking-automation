import { PLATZI_API_BASE_URL } from '@app/config/apiEnv';

export const endpoints = {
  products: `${PLATZI_API_BASE_URL}/products`,
  product: (id: number | string) => `${PLATZI_API_BASE_URL}/products/${id}`,
} as const;

import type { JSONSchemaType } from 'ajv';

export interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  images: string[];
}

export const productSchema: JSONSchemaType<Product> = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    title: { type: 'string', minLength: 1 },
    price: { type: 'number' },
    description: { type: 'string', minLength: 1 },
    images: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'title', 'price', 'description', 'images'],
  additionalProperties: true,
};

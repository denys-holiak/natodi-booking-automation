import type { APIRequestContext, APIResponse } from '@playwright/test';
import { endpoints } from '@app/api/endpoints';
import type { Product } from '@app/api/schemas/product.schema';

export interface ApiResult<T> {
  status: number;
  body: T;
}

export interface CreateProductPayload {
  title: string;
  price: number;
  description: string;
  categoryId: number;
  images: string[];
}

async function toResult<T>(response: APIResponse): Promise<ApiResult<T>> {
  return { status: response.status(), body: await response.json() };
}

export class PlatziApiClient {
  constructor(private readonly request: APIRequestContext) {}

  async getProduct(id: number | string): Promise<ApiResult<Product>> {
    const response = await this.request.get(endpoints.product(id));
    return toResult(response);
  }

  async createProduct(payload: CreateProductPayload): Promise<ApiResult<Product>> {
    const response = await this.request.post(endpoints.products, { data: payload });
    return toResult(response);
  }

  async deleteProduct(id: number | string): Promise<ApiResult<boolean>> {
    const response = await this.request.delete(endpoints.product(id));
    return toResult(response);
  }
}

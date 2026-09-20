import { test } from '@playwright/test';

type AsyncMethod<This, Args extends unknown[], Return> = (this: This, ...args: Args) => Return;

type StepTitle<Args extends unknown[]> = string | ((...args: Args) => string);

export function Step<This, Args extends unknown[], Return>(title: StepTitle<Args>) {
  return function (
    originalMethod: AsyncMethod<This, Args, Promise<Return>>,
  ): AsyncMethod<This, Args, Promise<Return>> {
    return function (this: This, ...args: Args): Promise<Return> {
      const resolvedTitle = typeof title === 'function' ? title(...args) : title;
      return test.step(resolvedTitle, () => originalMethod.apply(this, args));
    };
  };
}

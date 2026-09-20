import { test, type Locator, type Page } from '@playwright/test';
import { ContinueBar } from '@app/components/ContinueBar';
import { Step } from '@app/utils/step';
import { partitionDayIndexes } from '@app/utils/workerPartition';

export interface BookedSlot {
  day: string;
  time: string;
}

const NO_CAPACITY_MESSAGE =
  'No bookable slot found in the visible calendar range - the widget has no free capacity left.';

export class SlotPicker {
  private readonly root: Locator;
  private readonly enabledDays: Locator;
  private readonly timeCells: Locator;
  readonly continueBar: ContinueBar;

  constructor(page: Page) {
    this.root = page.locator('app-date');
    this.continueBar = new ContinueBar(this.root);
    this.enabledDays = this.root.locator(
      'td.myDpDaycell:not(.myDpDisabled):not(.myDpNextMonth):not(.myDpPrevMonth)',
    );
    this.timeCells = this.root.locator('.time-cell');
  }

  @Step('Select a random available date and time')
  async selectNextAvailableSlot(): Promise<BookedSlot> {
    const calendarLoaded = await this.enabledDays
      .first()
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    if (!calendarLoaded) {
      throw new Error(NO_CAPACITY_MESSAGE);
    }

    const dayCount = await this.enabledDays.count();
    const { parallelIndex, config } = test.info();
    const dayIndexes = partitionDayIndexes(dayCount, parallelIndex, config.workers || 1);

    for (const i of dayIndexes) {
      const day = this.enabledDays.nth(i);
      const dayLabel = (await day.innerText()).trim();
      await day.click();

      const hasSlot = await this.timeCells
        .first()
        .waitFor({ state: 'visible', timeout: 3_000 })
        .then(() => true)
        .catch(() => false);

      if (hasSlot) {
        const slotCount = await this.timeCells.count();
        const timeCell = this.timeCells.nth(Math.floor(Math.random() * slotCount));
        const time = (await timeCell.innerText()).trim();
        await timeCell.click();
        return { day: dayLabel, time };
      }
    }

    throw new Error(NO_CAPACITY_MESSAGE);
  }
}

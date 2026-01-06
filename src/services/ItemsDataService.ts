import fallbackItems from '../data/items.json';
import { EventRequirement, EventStage, Item } from '../shared/types';
import { createLogger } from './Logger';

type RawEventStage = Partial<EventStage> & { label: string };

type RawEventRequirement = {
  eventId: string;
  eventName?: string;
  active?: boolean;
  count?: number;
  stages?: RawEventStage[];
};

type RawItem = Omit<Item, 'imageFilename' | 'keepForEvents'> & {
  imageFilename?: string | null;
  keepForEvents?: RawEventRequirement[];
  img_hashed?: string | null;
  img_real?: string | null;
};

type ItemsResponse = Record<string, RawItem> | RawItem[];

const logger = createLogger('ItemsDataService');

export class ItemsDataService {
  private readonly remoteUrl = 'https://arc.kofim.dev/items.json';
  private readonly assetBaseUrl = 'https://arc.kofim.dev/';
  private readonly fallbackRecord: Record<string, Item>;
  private initPromise: Promise<void> | null = null;
  private readonly forceLocalStorageKey = 'recycleme_force_local_items';
  private itemsRecord: Record<string, Item> = {};
  private itemsArray: Item[] = [];

  constructor() {
    this.fallbackRecord = this.cloneToRecord(fallbackItems as ItemsResponse, false);
    this.setItems(this.fallbackRecord);
  }

  /**
   * Ensures remote items are fetched once during application startup.
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      if (this.shouldForceLocalData()) {
        logger.warn('Force-local flag detected, skipping remote fetch');
        this.setItems(this.fallbackRecord);
        return;
      }

      try {
        logger.log('Fetching items data from remote source...');
        const response = await fetch(this.remoteUrl, { cache: 'no-store' });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as ItemsResponse;
        this.setItems(data);
        logger.log('Items data loaded from remote source');
      } catch (error) {
        logger.error('Failed to load remote items data, falling back to bundled JSON', error);
        this.setItems(this.fallbackRecord);
      }
    })();

    return this.initPromise;
  }

  private shouldForceLocalData(): boolean {
    try {
      if (typeof localStorage === 'undefined') {
        return false;
      }
      const value = localStorage.getItem(this.forceLocalStorageKey);
      return value === 'true';
    } catch (error) {
      logger.warn('Unable to read force-local storage flag', error);
      return false;
    }
  }

  /**
   * Returns items as an array for iteration-heavy scenarios.
   */
  getItemsArray(): Item[] {
    return this.itemsArray;
  }

  /**
   * Returns items as a record keyed by item name.
   */
  getItemsRecord(): Record<string, Item> {
    return this.itemsRecord;
  }

  private setItems(data: ItemsResponse): void {
    const record = this.cloneToRecord(data, true);
    this.itemsRecord = record;
    this.itemsArray = Object.values(record);
  }

  private cloneToRecord(data: ItemsResponse, normalizeImages: boolean): Record<string, Item> {
    const record: Record<string, Item> = Array.isArray(data)
      ? data.reduce<Record<string, Item>>((acc, item) => {
          acc[item.name] = this.normalizeItem(item);
          return acc;
        }, {})
      : Object.keys(data).reduce<Record<string, Item>>((acc, key) => {
          acc[key] = this.normalizeItem((data as Record<string, RawItem>)[key]);
          return acc;
        }, {});

    if (normalizeImages) {
      Object.values(record).forEach((item) => {
        item.imageFilename = this.resolveImageUrl(item);
      });
    }

    return record;
  }

  private normalizeItem(raw: RawItem): Item {
    const normalizedEvents = this.normalizeEventRequirements(raw.keepForEvents);

    return {
      ...raw,
      keepForEvents: normalizedEvents,
      imageFilename: raw.imageFilename ?? null,
      img_hashed: raw.img_hashed ?? null,
      img_real: raw.img_real ?? null,
    };
  }

  private resolveImageUrl(item: Item): string | null {
    const hashed = (item.img_hashed ?? '').trim();
    if (hashed) {
      return this.toAbsoluteUrl(hashed);
    }

    if (item.imageFilename && item.imageFilename.trim()) {
      return item.imageFilename;
    }

    const fallbackItem = this.fallbackRecord[item.name];
    if (fallbackItem) {
      const fallbackHashed = (fallbackItem.img_hashed ?? '').trim();
      if (fallbackHashed) {
        return this.toAbsoluteUrl(fallbackHashed);
      }

      if (fallbackItem.imageFilename && fallbackItem.imageFilename.trim()) {
        return fallbackItem.imageFilename;
      }
    }

    return null;
  }

  private toAbsoluteUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const sanitizedPath = path.replace(/^\/+/, '');
    return `${this.assetBaseUrl}${sanitizedPath}`;
  }

  private normalizeEventRequirements(events?: RawEventRequirement[]): EventRequirement[] {
    if (!events || events.length === 0) {
      return [];
    }

    return events.map((event) => {
      const normalizedStages = (event.stages ?? []).map((stage) => ({
        stageId: stage.stageId ?? `${event.eventId}-${stage.label}`,
        label: stage.label,
        count: typeof stage.count === 'number' ? stage.count : 0,
      })) as EventStage[];
      const stageTotal = normalizedStages.reduce((sum, stage) => sum + stage.count, 0);
      const eventName = (event.eventName ?? event.eventId).trim();

      return {
        ...event,
        eventName,
        active: event.active ?? true,
        count: typeof event.count === 'number' && event.count > 0 ? event.count : stageTotal,
        stages: normalizedStages,
      } as EventRequirement;
    });
  }
}

export const itemsDataService = new ItemsDataService();


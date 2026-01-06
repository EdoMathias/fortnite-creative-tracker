export interface ItemDetail {
  item: string;
  count: number;
}

export interface KeepDetail {
  label: string;
  count: number;
}

export interface RecycleInfo {
  canRecycle: boolean;
  details: ItemDetail[];
}

export interface SalvageInfo {
  canSalvage: boolean;
  details: ItemDetail[];
}

export interface KeepInfo {
  shouldKeep: boolean;
  count: number;
  details: KeepDetail[];
}

export type KeepCategoryKey = 'workshop' | 'quests' | 'projects' | 'events';

export interface EventStage {
  stageId?: string;
  label: string;
  count: number;
}

export interface EventRequirement {
  eventId: string;
  eventName: string;
  active: boolean;
  count: number;
  stages: EventStage[];
}

export interface Item {
  name: string;
  rarity: string;
  recycles: RecycleInfo;
  salvagesInto: SalvageInfo;
  sellPrice: number;
  category: string;
  keepForWorkshop: KeepInfo;
  keepForQuests: KeepInfo;
  keepForProjects: KeepInfo;
  keepForEvents: EventRequirement[];
  imageFilename: string | null;
  img_hashed?: string | null;
  img_real?: string | null;
}


export type ProductState = 'AVAILABLE' | 'PRE_ORDER' | 'COMING_SOON' | 'SOLD_OUT';
export interface DropPlaceholder {
  source: 'mock';
  label: 'DEMO / MOCK DATA';
  title: string;
  description: string;
  collection: '[INFORMATION PENDING]';
  artwork: '[INFORMATION PENDING]';
}
export interface CommerceAdapter { getLatestDrop(): Promise<DropPlaceholder>; }

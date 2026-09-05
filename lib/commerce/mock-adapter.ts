import type { CommerceAdapter } from './types';
export const MockCommerceAdapter: CommerceAdapter = {
  async getLatestDrop() {
    return { source: 'mock', label: 'DEMO / MOCK DATA', title: 'Latest drop', description: 'The next chapter belongs here. Collection details and campaign imagery will appear once confirmed.', collection: '[INFORMATION PENDING]', artwork: '[INFORMATION PENDING]' };
  },
};

import { Hero } from '@/components/home/Hero';
import { LatestDrop } from '@/components/home/LatestDrop';
import { MockCommerceAdapter } from '@/lib/commerce/mock-adapter';
export default async function Home() {
  const drop = await MockCommerceAdapter.getLatestDrop();
  return <><Hero /><LatestDrop drop={drop} /></>;
}

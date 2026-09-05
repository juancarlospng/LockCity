import type { DropPlaceholder } from '@/lib/commerce/types';
export function LatestDrop({ drop }: { drop: DropPlaceholder }) {
  return <section id="latest-drop" className="latest-drop" aria-labelledby="drop-title" tabIndex={-1}>
    <div className="section-topline eyebrow"><span>02 / Latest drop</span><span>{drop.label}</span></div>
    <div className="drop-layout"><div><h2 id="drop-title" className="drop-heading">Latest<br />drop<span aria-hidden="true"> ↗</span></h2><p className="drop-copy">{drop.description}</p><dl className="pending-info"><dt>Collection details</dt><dd>{drop.collection}</dd></dl></div>
      <div className="drop-art" role="img" aria-label="Campaign imagery placeholder. Information pending."><span className="drop-art-corner eyebrow">LC / Image pending</span><span className="drop-art-label">CAMPAIGN ARTWORK<br />{drop.artwork}</span><div className="drop-art-footer eyebrow"><span>DEMO / MOCK DATA</span><span>— / —</span></div></div>
    </div>
  </section>;
}

import { useState, useSyncExternalStore } from 'react';
import { box, button, createFlow } from './shared';

export default function ReactDemo() {
  const [flow] = useState(createFlow);
  const s = useSyncExternalStore(flow.subscribe, flow.get, flow.get);

  return (
    <div className={box} data-demo="react">
      <strong>React</strong>
      <span data-step>
        {s.index + 1}/{s.steps.length}: {s.current.title}
      </span>
      <button className={button} disabled={s.isFirst} onClick={() => flow.prev()}>
        Prev
      </button>
      <button className={button} disabled={s.isLast} onClick={() => flow.next()}>
        Next
      </button>
    </div>
  );
}

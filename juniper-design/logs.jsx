// Activity log — automatic record of everything you do to your plants.
// Replaces the manual "journal". Watering, repotting, fertilising, moves,
// optional notes — all flow into the same chronological feed.

const LOG_KINDS = {
  water:     { icon: 'IconDrop',     verb: 'Watered',     tint: 'var(--moss)' },
  repot:     { icon: 'IconCactus',   verb: 'Repotted',    tint: 'var(--clay)' },
  fertilize: { icon: 'IconSparkle',  verb: 'Fertilised',  tint: 'var(--moss)' },
  move:      { icon: 'IconWindow',   verb: 'Moved',       tint: 'var(--ink-muted)' },
  note:      { icon: 'IconPencil',   verb: 'Noted',       tint: 'var(--ink-muted)' },
  joined:    { icon: 'IconSeedling', verb: 'Joined',      tint: 'var(--moss)' },
  observed:  { icon: 'IconLeaf',     verb: 'Observed',    tint: 'var(--moss)' },
};

// Seed an initial log so the app doesn't feel empty on first view.
function seedLog(plants) {
  const out = [];
  let cursor = Date.now();
  const day = 24 * 60 * 60 * 1000;

  // Add events for each plant — joined, plus a sprinkling of water/repot/notes
  plants.forEach((p) => {
    const joinedISO = p.addedISO ? new Date(p.addedISO).getTime() : cursor - 30 * day;

    // joined
    out.push({
      id: `${p.id}-joined`,
      plantId: p.id, kind: 'joined',
      text: `${p.name} joined you.`,
      when: joinedISO,
    });

    // existing journal → observations
    (p.journal || []).forEach((j, i) => {
      out.push({
        id: `${p.id}-obs-${i}`,
        plantId: p.id, kind: 'observed',
        text: j.text,
        when: cursor - (5 + i * 14) * day,
      });
    });

    // last watering, if not currently thirsty
    if (p.daysSinceWater < p.waterEvery) {
      out.push({
        id: `${p.id}-water-last`,
        plantId: p.id, kind: 'water',
        text: `Watered ${p.name}.`,
        when: cursor - p.daysSinceWater * day,
      });
    }
  });

  // a couple of richer events
  if (plants.find(p => p.id === 'marcel')) {
    out.push({
      id: 'marcel-repot',
      plantId: 'marcel', kind: 'repot',
      text: 'Repotted Marcel into the terracotta one. Roots were starting to circle.',
      when: cursor - 31 * day,
    });
  }
  if (plants.find(p => p.id === 'juniper')) {
    out.push({
      id: 'juniper-fertilize',
      plantId: 'juniper', kind: 'fertilize',
      text: 'Fed Juniper a half-strength dose.',
      when: cursor - 12 * day,
    });
  }
  if (plants.find(p => p.id === 'pip')) {
    out.push({
      id: 'pip-move',
      plantId: 'pip', kind: 'move',
      text: 'Moved Pip closer to the south window.',
      when: cursor - 19 * day,
    });
  }

  return out.sort((a, b) => b.when - a.when);
}

// ─── Components ────────────────────────────────────────────────

function LogFeed({ entries, plants, scope = 'all' }) {
  // Group by day bucket
  const groups = groupByDay(entries);
  const plantById = Object.fromEntries(plants.map(p => [p.id, p]));

  if (entries.length === 0) {
    return (
      <div style={{
        padding: '40px 0',
        fontFamily: 'var(--serif)', fontStyle: 'italic',
        fontSize: 15, color: 'var(--ink-faint)',
        textAlign: 'center',
      }}>
        Nothing logged yet. The record begins with the first watering.
      </div>
    );
  }

  return (
    <div>
      {groups.map(([label, items]) => (
        <div key={label} style={{ marginBottom: 28 }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            color: 'var(--ink-faint)', marginBottom: 8,
            paddingLeft: 36,
          }}>{label}</div>
          {items.map((e, i) => (
            <LogRow key={e.id} entry={e} plant={plantById[e.plantId]}
              showPlant={scope === 'all'}
              isLast={i === items.length - 1} />
          ))}
        </div>
      ))}
    </div>
  );
}

function LogRow({ entry, plant, showPlant, isLast }) {
  const kind = LOG_KINDS[entry.kind] || LOG_KINDS.note;
  const I = window[kind.icon] || IconLeaf;

  return (
    <div style={{
      display: 'flex', gap: 14, padding: '12px 0',
      borderBottom: isLast ? 'none' : '1px solid var(--hairline)',
      alignItems: 'flex-start',
    }}>
      {/* icon column — small line glyph + connector */}
      <div style={{
        flexShrink: 0, width: 22,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        color: kind.tint, paddingTop: 1,
      }}>
        <I size={16} stroke={1.4} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--serif)', fontSize: 16,
          lineHeight: 1.45, color: 'var(--ink)',
          fontStyle: entry.kind === 'observed' || entry.kind === 'note' ? 'normal' : 'normal',
          textWrap: 'pretty',
        }}>
          {entry.text}
        </div>
        {showPlant && plant && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            marginTop: 4,
            fontFamily: 'var(--serif)', fontStyle: 'italic',
            fontSize: 13, color: 'var(--ink-faint)',
          }}>
            {plant.species}
          </div>
        )}
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10,
          color: 'var(--ink-faint)', letterSpacing: '0.06em',
          marginTop: 4,
        }}>
          {timeAgo(entry.when)}
        </div>
      </div>
    </div>
  );
}

function groupByDay(entries) {
  const groups = new Map();
  const now = new Date();
  const today = startOfDay(now);
  entries.forEach(e => {
    const d = startOfDay(new Date(e.when));
    const diffDays = Math.round((today - d) / (1000 * 60 * 60 * 24));
    let label;
    if (diffDays <= 0) label = 'Today';
    else if (diffDays === 1) label = 'Yesterday';
    else if (diffDays < 7) label = new Date(e.when).toLocaleDateString('en-GB', { weekday: 'long' });
    else if (diffDays < 30) label = `${diffDays} days ago`;
    else label = new Date(e.when).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(e);
  });
  return Array.from(groups.entries());
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function timeAgo(when) {
  const m = Math.floor((Date.now() - when) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = new Date(when);
  return d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
}

// ─── Action row ────────────────────────────────────────────────
// Sits under the Water button on Plant Detail; logs minor actions.

function LogActionsRow({ plant, onAction }) {
  const actions = [
    { kind: 'repot',     label: 'Repot',     icon: IconCactus  },
    { kind: 'fertilize', label: 'Fertilise', icon: IconSparkle },
    { kind: 'move',      label: 'Move',      icon: IconWindow  },
    { kind: 'note',      label: 'Note',      icon: IconPencil  },
  ];
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 8, marginTop: 12,
    }}>
      {actions.map(a => (
        <button key={a.kind} onClick={() => onAction(a.kind)}
          style={{
            border: '1px solid var(--hairline-strong)',
            background: 'transparent',
            borderRadius: 12,
            padding: '12px 4px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            color: 'var(--ink)',
            fontFamily: 'var(--sans)', fontSize: 12,
            transition: 'background 220ms var(--ease), border-color 220ms var(--ease)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.background = 'var(--paper)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--hairline-strong)'; e.currentTarget.style.background = 'transparent'; }}>
          <a.icon size={20} stroke={1.4} />
          <span>{a.label}</span>
        </button>
      ))}
    </div>
  );
}

Object.assign(window, { LOG_KINDS, seedLog, LogFeed, LogActionsRow });

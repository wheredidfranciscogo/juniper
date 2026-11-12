// Inline note editor and combined Add-Plant edit page.

// ─── NoteEditor ────────────────────────────────────────────────
// An inline journal-entry composer that looks like a slip of paper.

function NoteEditor({ onSave, onCancel }) {
  const [text, setText] = React.useState('');
  const ref = React.useRef(null);
  React.useEffect(() => {
    ref.current?.focus();
  }, []);

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long' });

  return (
    <div className="jj-fade" style={{
      background: 'var(--paper)',
      border: '1px dashed var(--hairline-strong)',
      borderRadius: var_md,
      padding: '14px 16px 12px',
      marginBottom: 24,
    }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 10,
        letterSpacing: '0.16em', textTransform: 'uppercase',
        color: 'var(--ink-faint)', marginBottom: 8,
      }}>{today}</div>
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What did you notice today?"
        rows={3}
        style={{
          width: '100%', border: 0, outline: 'none',
          background: 'transparent', resize: 'none',
          fontFamily: 'var(--serif)', fontSize: 17,
          lineHeight: 1.5, color: 'var(--ink)',
        }}
      />
      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: 12,
        marginTop: 8, paddingTop: 8,
        borderTop: '1px solid var(--hairline)',
      }}>
        <button onClick={onCancel} style={{
          fontFamily: 'var(--sans)', fontSize: 13,
          color: 'var(--ink-muted)', padding: '4px 8px',
        }}>Discard</button>
        <button
          onClick={() => text.trim() && onSave(text.trim())}
          disabled={!text.trim()}
          style={{
            fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500,
            color: text.trim() ? 'var(--clay)' : 'var(--ink-faint)',
            padding: '4px 8px',
            cursor: text.trim() ? 'pointer' : 'default',
          }}>Save note</button>
      </div>
    </div>
  );
}
const var_md = '14px';

// ─── AddPlantEditScreen ────────────────────────────────────────
// Single combined edit page that follows path selection.
// Pre-fills different fields based on path: photo → species + light guess;
// search → full species data; manual → empty.

function AddPlantEditScreen({ path, onCancel, onSave }) {
  const seed = seedFromPath(path);
  const [draft, setDraft] = React.useState(seed);

  function setField(k, v) { setDraft({ ...draft, [k]: v }); }

  const canSave = draft.name.trim().length > 0;

  return (
    <div className="paper-bg jj-fade" style={{ minHeight: '100%', paddingBottom: 100 }}>
      {/* top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'var(--paper)',
        padding: '54px 16px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={onCancel} style={{
          fontFamily: 'var(--sans)', fontSize: 14,
          color: 'var(--ink-muted)', padding: 8,
        }}>Cancel</button>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: 'var(--ink-faint)',
        }}>
          {pathLabel(path)}
        </div>
        <button
          onClick={() => canSave && onSave(buildPlant(draft))}
          disabled={!canSave}
          style={{
            fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 500,
            color: canSave ? 'var(--clay)' : 'var(--ink-faint)',
            padding: 8,
            cursor: canSave ? 'pointer' : 'default',
          }}>Save</button>
      </div>

      {/* Hero pressing preview */}
      <div style={{ padding: '4px 24px 20px' }}>
        <div style={{ borderRadius: var_lg, overflow: 'hidden' }}>
          <PlantPressing
            plant={{ id: 'new', species: draft.species || 'New plant', icon: draft.icon, pressing: draft.pressing }}
            ratio="3/2"
          />
        </div>
        {path === 'photo' && (
          <div style={{
            fontFamily: 'var(--serif)', fontStyle: 'italic',
            fontSize: 14, color: 'var(--ink-muted)',
            marginTop: 10, textAlign: 'center', lineHeight: 1.5,
            textWrap: 'pretty',
          }}>
            From your photo, this looks like <span style={{ color: 'var(--ink)' }}>{draft.species}</span>. Change it if I'm wrong.
          </div>
        )}
      </div>

      {/* Form */}
      <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <FieldText
          label="Their name"
          hint="Personal, not Latin."
          placeholder="Marcel, Juniper, Sage…"
          value={draft.name}
          onChange={(v) => setField('name', v)}
        />
        <FieldText
          label="Species"
          hint="If you know it."
          placeholder="Monstera deliciosa"
          italic
          value={draft.species}
          onChange={(v) => setField('species', v)}
        />
        <FieldText
          label="Where they live"
          hint="A room, a window, a corner."
          placeholder="Living room, east window"
          value={draft.location}
          onChange={(v) => setField('location', v)}
        />

        {/* Watering — slider styled as a hairline */}
        <FieldRow label="Water every" hint="You can adjust later.">
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            paddingTop: 6,
          }}>
            <input type="range" min="2" max="30" step="1"
              value={draft.waterEvery}
              onChange={(e) => setField('waterEvery', Number(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--clay)' }}
            />
            <div className="tabular" style={{
              fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)',
              minWidth: 70, textAlign: 'right',
            }}>{draft.waterEvery} days</div>
          </div>
        </FieldRow>

        {/* Light */}
        <FieldRow label="Light" hint="Wherever they sit most of the day.">
          <SegRow
            value={draft.light}
            onChange={(v) => setField('light', v)}
            options={[
              { v: 'bright direct',   label: 'Direct' },
              { v: 'bright indirect', label: 'Bright' },
              { v: 'medium',          label: 'Medium' },
              { v: 'low',             label: 'Low' },
            ]}
          />
        </FieldRow>

        {/* Pressing color */}
        <FieldRow label="Pressing colour" hint="How you'd press them in a notebook.">
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            {['moss', 'clay', 'deep'].map(tone => (
              <button key={tone} onClick={() => setField('pressing', tone)}
                style={{
                  flex: 1, height: 44, borderRadius: 10,
                  border: draft.pressing === tone ? '2px solid var(--ink)' : '1px solid var(--hairline-strong)',
                  padding: 0, overflow: 'hidden',
                }}>
                <div className={`jj-pressing ${tone}`} style={{ width: '100%', height: '100%' }} />
              </button>
            ))}
          </div>
        </FieldRow>

        {/* First note */}
        <FieldText
          label="A note for the day they joined"
          hint="Optional."
          placeholder="Found at the market on a quiet Saturday…"
          multiline
          value={draft.firstNote}
          onChange={(v) => setField('firstNote', v)}
        />
      </div>
    </div>
  );
}

function seedFromPath(path) {
  if (path === 'photo') {
    return {
      name: '', species: 'Monstera deliciosa', location: '',
      waterEvery: 7, light: 'bright indirect',
      pressing: 'moss', icon: 'monstera', firstNote: '',
    };
  }
  if (path === 'search') {
    return {
      name: '', species: '', location: '',
      waterEvery: 7, light: 'bright indirect',
      pressing: 'moss', icon: 'leaf', firstNote: '',
    };
  }
  return {
    name: '', species: '', location: '',
    waterEvery: 7, light: 'bright indirect',
    pressing: 'moss', icon: 'leaf', firstNote: '',
  };
}

function pathLabel(path) {
  return path === 'photo' ? 'from a photo'
       : path === 'search' ? 'by name'
       : 'manually';
}

function buildPlant(d) {
  const id = (d.name || 'new').toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).slice(2,5);
  return {
    id, name: d.name || 'Unnamed', species: d.species || '',
    nickname: d.location || '', pressing: d.pressing, icon: d.icon,
    waterEvery: d.waterEvery, daysSinceWater: 0,
    light: d.light, temp: 'warm', tendedDays: 0,
    addedISO: new Date().toISOString().slice(0,10),
    photos: [],
    journal: d.firstNote ? [{ date: 'Today', text: d.firstNote }] : [],
  };
}

function FieldRow({ label, hint, children }) {
  return (
    <div>
      <div style={{
        fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500,
        color: 'var(--ink)', marginBottom: 2,
      }}>{label}</div>
      {hint && (
        <div style={{
          fontFamily: 'var(--serif)', fontStyle: 'italic',
          fontSize: 13, color: 'var(--ink-faint)', marginBottom: 6,
        }}>{hint}</div>
      )}
      {children}
    </div>
  );
}

function FieldText({ label, hint, placeholder, value, onChange, italic, multiline }) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <FieldRow label={label} hint={hint}>
      <Tag
        type="text"
        rows={multiline ? 3 : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'transparent', border: 0,
          borderBottom: '1px solid var(--hairline-strong)',
          padding: '8px 0 8px',
          fontFamily: italic ? 'var(--serif)' : 'var(--sans)',
          fontStyle: italic ? 'italic' : 'normal',
          fontSize: italic ? 17 : 16,
          color: 'var(--ink)', outline: 'none',
          resize: 'none',
        }}
      />
    </FieldRow>
  );
}

function SegRow({ value, onChange, options }) {
  return (
    <div style={{
      display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 4,
    }}>
      {options.map(o => {
        const active = value === o.v;
        return (
          <button key={o.v} onClick={() => onChange(o.v)}
            style={{
              padding: '8px 14px', borderRadius: 9999,
              border: active ? '1px solid var(--ink)' : '1px solid var(--hairline-strong)',
              background: active ? 'var(--paper)' : 'transparent',
              color: active ? 'var(--ink)' : 'var(--ink-muted)',
              fontFamily: 'var(--sans)', fontSize: 13,
              cursor: 'pointer',
            }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, { NoteEditor, AddPlantEditScreen });

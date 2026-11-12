// Main app screens: Today, Garden, PlantDetail, AddPlant, Journal, You

// ─── Shared bits ───────────────────────────────────────────────

function ScreenHeader({ overline, title, right, paddingTop = 64 }) {
  return (
    <div style={{
      padding: `${paddingTop}px 24px 12px`,
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          {overline && (
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 10,
              letterSpacing: '0.22em', textTransform: 'uppercase',
              color: 'var(--ink-faint)', marginBottom: 8,
            }}>{overline}</div>
          )}
          <h1 style={{
            fontFamily: 'var(--serif)', fontWeight: 400,
            fontSize: 28, lineHeight: 1.15, letterSpacing: '-0.012em',
            color: 'var(--ink)', margin: 0, textWrap: 'pretty',
          }}>{title}</h1>
        </div>
        {right}
      </div>
    </div>
  );
}

function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'A late hello';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'A quiet night';
}

function ageStr(daysAgo) {
  if (daysAgo === 0) return 'today';
  if (daysAgo === 1) return 'yesterday';
  const wd = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  if (daysAgo < 7) {
    const d = new Date(); d.setDate(d.getDate() - daysAgo);
    return wd[d.getDay()];
  }
  return `${daysAgo} days ago`;
}

// ─── Today ─────────────────────────────────────────────────────

function TodayScreen({ plants, onWater, onOpenPlant, onAdd, archetype, name = 'June' }) {
  const thirsty = plants.filter(p => p.daysSinceWater >= p.waterEvery);
  const upcoming = plants
    .filter(p => p.daysSinceWater < p.waterEvery)
    .map(p => ({ ...p, until: p.waterEvery - p.daysSinceWater }))
    .sort((a,b) => a.until - b.until);

  const greeting = greetingFor();
  const headline = `${greeting}, ${name}.`;

  return (
    <div className="paper-bg jj-fade" style={{ minHeight: '100%', paddingBottom: 80 }}>
      <ScreenHeader
        overline={new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}).toLowerCase()}
        title={headline}
      />

      {/* Thirsty cards — horizontal scroll, ~85% width each */}
      {thirsty.length > 0 ? (
        <div className="no-scrollbar" style={{
          display: 'flex', gap: 14, padding: '8px 24px 12px',
          overflowX: 'auto', scrollSnapType: 'x mandatory',
        }}>
          {thirsty.map(p => (
            <ThirstyCard key={p.id} plant={p}
              onWater={() => onWater(p.id)}
              onOpen={() => onOpenPlant(p.id)} />
          ))}
        </div>
      ) : (
        <div style={{ padding: '12px 24px 12px' }}>
          <div className="jj-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ color: 'var(--moss)' }}><IconCheck size={28} stroke={1.4} /></div>
            <div>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 19, color: 'var(--ink)' }}>
                Nothing to water today.
              </div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-muted)', marginTop: 4 }}>
                Maybe take a slow walk past them.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* later this week — quiet list */}
      <div style={{ padding: '36px 24px 24px' }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: 'var(--ink-faint)', marginBottom: 12,
        }}>
          all caught up later this week
        </div>
        <div>
          {upcoming.slice(0, 6).map((p, i) => (
            <button key={p.id} onClick={() => onOpenPlant(p.id)} style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              width: '100%', padding: '11px 0',
              borderBottom: i < Math.min(upcoming.length, 6) - 1 ? '1px solid var(--hairline)' : 'none',
              textAlign: 'left',
            }}>
              <div>
                <span style={{
                  fontFamily: 'var(--serif)', fontSize: 17,
                  color: 'var(--ink)',
                }}>{p.name}</span>
                <span style={{
                  fontFamily: 'var(--serif)', fontStyle: 'italic',
                  fontSize: 14, color: 'var(--ink-faint)', marginLeft: 8,
                }}>{p.species}</span>
              </div>
              <div className="tabular" style={{
                fontSize: 13, color: 'var(--ink-muted)',
              }}>
                in {p.until} day{p.until === 1 ? '' : 's'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* archetype footer */}
      {archetype && (
        <div style={{
          padding: '16px 24px 32px',
          fontFamily: 'var(--serif)', fontStyle: 'italic',
          fontSize: 13, color: 'var(--ink-faint)',
          textAlign: 'center', lineHeight: 1.5,
        }}>
          — {archetype.name}, tending {plants.length} plants —
        </div>
      )}
    </div>
  );
}

function numberWord(n) {
  return ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine'][n] || String(n);
}

function ThirstyCard({ plant, onWater, onOpen }) {
  const [watering, setWatering] = React.useState(false);
  const [done, setDone] = React.useState(false);

  function handleWater(e) {
    e.stopPropagation();
    if (done || watering) return;
    setWatering(true);
    setTimeout(() => { setDone(true); onWater(); }, 600);
  }

  return (
    <div onClick={onOpen} style={{
      flex: '0 0 85%', minWidth: '85%', scrollSnapAlign: 'start',
      background: 'var(--surface)',
      borderRadius: var_lg,
      border: '1px solid var(--hairline)',
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'transform 280ms var(--ease)',
    }}>
      <PlantPressing plant={plant} ratio="4/3" />

      <div style={{ padding: '16px 18px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)',
              lineHeight: 1.1,
            }}>{plant.name}</div>
            <div style={{
              fontFamily: 'var(--serif)', fontStyle: 'italic',
              fontSize: 14, color: 'var(--ink-muted)', marginTop: 2,
            }}>{plant.species}</div>
          </div>
          <div style={{
            position: 'relative',
            fontFamily: 'var(--mono)', fontSize: 10,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            paddingTop: 4,
            minWidth: 64,
            textAlign: 'right',
          }}>
            <span style={{
              position: 'absolute', right: 0, top: 4,
              color: 'var(--dried)',
              opacity: done ? 0 : 1,
              transition: 'opacity 320ms var(--ease)',
            }}>thirsty</span>
            <span style={{
              color: 'var(--moss)',
              opacity: done ? 1 : 0,
              transition: 'opacity 320ms var(--ease) 220ms',
            }}>watered</span>
          </div>
        </div>

        <div style={{ marginTop: 14, position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
          <button
            onClick={handleWater}
            disabled={done}
            className="jj-btn-clay"
            style={{
              width: '100%', padding: '14px',
              background: done ? 'var(--moss)' : 'var(--clay)',
              transition: 'background 600ms var(--ease-long)',
              position: 'relative',
            }}>
            {watering && <span className="jj-ripple-dot" />}
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 18 }}>
              <span style={{
                position: 'absolute', display: 'inline-flex', alignItems: 'center', gap: 8,
                opacity: done ? 0 : 1,
                transition: 'opacity 320ms var(--ease)',
              }}>
                <IconDrop size={16} stroke={1.6} /> Water
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                opacity: done ? 1 : 0,
                transition: 'opacity 320ms var(--ease) 220ms',
              }}>
                <IconCheck size={16} stroke={1.8} /> Watered
              </span>
            </span>
          </button>
        </div>

        <div style={{
          marginTop: 10,
          fontFamily: 'var(--sans)', fontSize: 12,
          color: 'var(--ink-muted)',
        }}>
          Last watered {ageStr(plant.daysSinceWater)}.
        </div>
      </div>
    </div>
  );
}
const var_lg = '18px';

// ─── Garden ────────────────────────────────────────────────────

function GardenScreen({ plants, onOpenPlant, onAdd }) {
  const [filter, setFilter] = React.useState('all');
  const filters = [
    { v: 'all', label: 'All' },
    { v: 'thirsty', label: 'Thirsty' },
    { v: 'house', label: 'Indoor' },
    { v: 'outdoor', label: 'Outdoor' },
  ];
  const filtered = plants.filter(p => {
    if (filter === 'thirsty') return p.daysSinceWater >= p.waterEvery;
    return true; // toy filter
  });
  return (
    <div className="paper-bg jj-fade" style={{ minHeight: '100%', paddingBottom: 80 }}>
      <ScreenHeader
        overline={`${plants.length} plants in your care`}
        title="The Garden"
      />

      <div style={{ padding: '8px 24px 12px', display: 'flex', gap: 8, overflowX: 'auto' }} className="no-scrollbar">
        {filters.map(f => (
          <button key={f.v} className={`jj-chip ${filter === f.v ? 'active' : ''}`}
            onClick={() => setFilter(f.v)}>
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '6px 24px 24px' }}>
        {filtered.map((p, i) => (
          <GardenRow key={p.id} plant={p} onOpen={() => onOpenPlant(p.id)}
            isLast={i === filtered.length - 1} />
        ))}
        {filtered.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '60px 0',
            fontFamily: 'var(--serif)', fontStyle: 'italic',
            color: 'var(--ink-faint)',
          }}>
            Nothing here, for now.
          </div>
        )}
      </div>
    </div>
  );
}

function GardenRow({ plant, onOpen, isLast }) {
  const until = plant.waterEvery - plant.daysSinceWater;
  const thirsty = until <= 0;
  return (
    <button onClick={onOpen} style={{
      display: 'flex', alignItems: 'center', gap: 16,
      width: '100%', padding: '16px 0',
      borderBottom: isLast ? 'none' : '1px solid var(--hairline)',
      textAlign: 'left',
    }}>
      <div style={{
        width: 60, height: 60, borderRadius: 999,
        overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{ width: 60, height: 60 }}>
          <PlantPressing plant={plant} ratio="1/1" round={999} />
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--serif)', fontSize: 19,
          color: 'var(--ink)', lineHeight: 1.1,
        }}>{plant.name}</div>
        <div style={{
          fontFamily: 'var(--serif)', fontStyle: 'italic',
          fontSize: 13, color: 'var(--ink-muted)', marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{plant.species}</div>
      </div>
      <div className="tabular" style={{
        fontFamily: 'var(--sans)', fontSize: 13,
        color: thirsty ? 'var(--clay)' : 'var(--ink-muted)',
        textAlign: 'right', minWidth: 80,
      }}>
        {thirsty ? 'thirsty' : `in ${until}d`}
      </div>
    </button>
  );
}

// ─── Plant Detail ──────────────────────────────────────────────

function PlantDetailScreen({ plant, onBack, onWater, onAddNote, onLogAction, log = [] }) {
  const [done, setDone] = React.useState(plant.daysSinceWater < plant.waterEvery);
  const [watering, setWatering] = React.useState(false);
  const [editingNote, setEditingNote] = React.useState(false);

  const plantLog = log.filter(e => e.plantId === plant.id);

  function handleWater() {
    if (done || watering) return;
    setWatering(true);
    setTimeout(() => { setDone(true); onWater(plant.id); }, 600);
  }

  const lastWatered = ageStr(plant.daysSinceWater);

  return (
    <div className="paper-bg jj-fade" style={{ minHeight: '100%', paddingBottom: 90 }}>
      {/* Hero photo */}
      <div style={{ position: 'relative' }}>
        <PlantPressing plant={plant} ratio="4/5" big round={0} />
        {/* glass back */}
        <button onClick={onBack} style={{
          position: 'absolute', top: 56, left: 16,
          width: 40, height: 40, borderRadius: 999,
          background: 'rgba(250,249,245,0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--hairline)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink)',
        }} aria-label="Back">
          <IconBack size={18} />
        </button>
        <button style={{
          position: 'absolute', top: 56, right: 16,
          width: 40, height: 40, borderRadius: 999,
          background: 'rgba(250,249,245,0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--hairline)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink)',
        }} aria-label="Edit">
          <IconPencil size={16} />
        </button>
      </div>

      {/* Name */}
      <div style={{ padding: '24px 24px 8px' }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: 'var(--ink-faint)', marginBottom: 8,
        }}>
          tended for {plant.tendedDays} days
        </div>
        <h1 style={{
          fontFamily: 'var(--serif)', fontWeight: 400,
          fontSize: 38, lineHeight: 1, letterSpacing: '-0.015em',
          color: 'var(--ink)', margin: '0 0 6px',
        }}>{plant.name}</h1>
        <div style={{
          fontFamily: 'var(--serif)', fontStyle: 'italic',
          fontSize: 18, color: 'var(--ink-muted)',
        }}>{plant.species}</div>
        {plant.nickname && (
          <div style={{
            fontFamily: 'var(--sans)', fontSize: 13,
            color: 'var(--ink-faint)', marginTop: 10,
            fontStyle: 'italic',
          }}>{plant.nickname}</div>
        )}
      </div>

      {/* care stats — small inline line-icons */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', columnGap: 18, rowGap: 8,
        padding: '18px 24px 4px',
      }}>
        <InlineStat icon={<IconDrop size={15} stroke={1.5} />} value={`every ${plant.waterEvery} days`} />
        <InlineStat icon={<IconSun size={15} stroke={1.5} />} value={plant.light} />
        <InlineStat icon={<IconThermometer size={15} stroke={1.5} />} value={plant.temp} />
      </div>

      {/* Water button */}
      <div style={{ padding: '20px 24px 0' }}>
        <button onClick={handleWater} disabled={done}
          className="jj-btn-clay"
          style={{
            width: '100%', padding: 16, position: 'relative', overflow: 'hidden',
            background: done ? 'var(--moss)' : 'var(--clay)',
            transition: 'background 600ms var(--ease-long)',
          }}>
          {watering && <span className="jj-ripple-dot" />}
          <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 20 }}>
            <span style={{
              position: 'absolute', display: 'inline-flex', alignItems: 'center', gap: 8,
              opacity: done ? 0 : 1,
              transition: 'opacity 320ms var(--ease)',
              whiteSpace: 'nowrap',
            }}>
              <IconDrop size={16} stroke={1.6} /> Water {plant.name}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              opacity: done ? 1 : 0,
              transition: 'opacity 320ms var(--ease) 220ms',
              whiteSpace: 'nowrap',
            }}>
              <IconCheck size={16} stroke={1.8} /> Watered, {lastWatered}
            </span>
          </span>
        </button>
      </div>

      {/* Photo timeline */}
      <div style={{ marginTop: 32 }}>
        <div style={{
          padding: '0 24px 12px',
          fontFamily: 'var(--mono)', fontSize: 10,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: 'var(--ink-faint)',
        }}>a slow record</div>
        <div className="no-scrollbar" style={{
          display: 'flex', gap: 12, padding: '0 24px',
          overflowX: 'auto',
        }}>
          {plant.photos.map((ph, i) => (
            <PhotoTile key={i} plant={plant} photo={ph} variant={i % 3} />
          ))}
        </div>
      </div>

      {/* Actions row — repot, fertilise, move, note */}
      <div style={{ padding: '0 24px' }}>
        <LogActionsRow plant={plant} onAction={(k) => {
          if (k === 'note') setEditingNote(true);
          else onLogAction && onLogAction(plant.id, k);
        }} />
      </div>

      {/* Per-plant log */}
      <div style={{ padding: '36px 24px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            color: 'var(--ink-faint)',
          }}>their log</div>
          {!editingNote && (
            <button onClick={() => setEditingNote(true)} style={{
              fontFamily: 'var(--sans)', fontSize: 12,
              color: 'var(--clay)', letterSpacing: '0.01em',
            }}>+ a note</button>
          )}
        </div>

        {editingNote && (
          <NoteEditor
            onCancel={() => setEditingNote(false)}
            onSave={(text) => {
              onAddNote && onAddNote(plant.id, text);
              setEditingNote(false);
            }}
          />
        )}

        <LogFeed entries={plantLog} plants={[plant]} scope="plant" />
      </div>
    </div>
  );
}

function InlineStat({ icon, value }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      color: 'var(--ink-muted)',
    }}>
      <span style={{ color: 'var(--moss)' }}>{icon}</span>
      <span style={{
        fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink)',
        lineHeight: 1,
      }}>{value}</span>
    </div>
  );
}

function StatCell({ icon, label, value }) {
  return (
    <div style={{
      flex: 1, padding: '4px 12px',
      borderLeft: '1px solid var(--hairline)',
    }}>
      <div style={{ color: 'var(--moss)' }}>{icon}</div>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 9,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        color: 'var(--ink-faint)', marginTop: 8,
      }}>{label}</div>
      <div style={{
        fontFamily: 'var(--serif)', fontSize: 14,
        color: 'var(--ink)', marginTop: 2,
        lineHeight: 1.2,
      }}>{value}</div>
    </div>
  );
}

function PhotoTile({ plant, photo, variant }) {
  // small tile, dated; rotate icon a touch differently per index
  return (
    <div style={{
      flex: '0 0 120px', width: 120,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{
        width: 120, height: 150, borderRadius: 10,
        overflow: 'hidden',
      }}>
        <PlantPressing plant={plant} ratio="4/5" round={10} />
      </div>
      <div className="tabular" style={{
        fontFamily: 'var(--mono)', fontSize: 10,
        color: 'var(--ink-faint)', letterSpacing: '0.05em',
      }}>{formatPhotoDate(photo.date)}</div>
      {photo.label && (
        <div style={{
          fontFamily: 'var(--serif)', fontStyle: 'italic',
          fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.3,
        }}>{photo.label}</div>
      )}
    </div>
  );
}

function formatPhotoDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB',{day:'numeric', month:'short'}).toLowerCase();
}

// ─── Add Plant ─────────────────────────────────────────────────

function AddPlantScreen({ onClose, onPicked }) {
  const paths = [
    { v: 'photo',   label: 'Identify by photo', hint: 'Snap a leaf, I will look', icon: IconCamera },
    { v: 'search',  label: 'Search by name',    hint: 'If you already know it',   icon: IconSearch },
    { v: 'manual',  label: 'Add manually',      hint: 'Pencil it in yourself',    icon: IconPencil },
  ];
  return (
    <div className="paper-bg jj-fade" style={{ minHeight: '100%', paddingBottom: 40 }}>
      <div style={{ padding: '60px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <button onClick={onClose} style={{
          width: 40, height: 40, borderRadius: 999,
          border: '1px solid var(--hairline-strong)',
          background: 'var(--paper)',
          color: 'var(--ink-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconClose size={18} />
        </button>
      </div>

      <div style={{ padding: '40px 24px 24px' }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: 'var(--ink-faint)', marginBottom: 8,
        }}>
          welcome the new one
        </div>
        <h1 style={{
          fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 400,
          lineHeight: 1.1, letterSpacing: '-0.012em',
          color: 'var(--ink)', margin: 0,
        }}>
          How would you like to <span style={{ fontStyle: 'italic' }}>add</span> them?
        </h1>
      </div>

      <div style={{ padding: '8px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {paths.map(p => (
          <button key={p.v} onClick={() => onPicked(p.v)}
            className="jj-card"
            style={{
              padding: '22px 20px',
              display: 'flex', alignItems: 'center', gap: 16,
              textAlign: 'left',
              transition: 'transform 240ms var(--ease), border-color 240ms var(--ease)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--ink)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--hairline)'}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'var(--paper)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--moss)', flexShrink: 0,
              border: '1px solid var(--hairline)',
            }}>
              <p.icon size={28} stroke={1.3} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'var(--serif)', fontSize: 19,
                color: 'var(--ink)',
              }}>{p.label}</div>
              <div style={{
                fontFamily: 'var(--sans)', fontSize: 13,
                color: 'var(--ink-muted)', marginTop: 4,
              }}>{p.hint}</div>
            </div>
          </button>
        ))}
      </div>

      <div style={{
        padding: '40px 24px 0',
        fontFamily: 'var(--serif)', fontStyle: 'italic',
        fontSize: 14, color: 'var(--ink-faint)', lineHeight: 1.55,
        textWrap: 'pretty',
      }}>
        No rush. You can always come back and fill in the rest later — name first, leaves later.
      </div>
    </div>
  );
}

// ─── Log (was Journal) ─────────────────────────────────────────

function LogScreen({ plants, log }) {
  return (
    <div className="paper-bg jj-fade" style={{ minHeight: '100%', paddingBottom: 80 }}>
      <ScreenHeader
        overline="a slow record"
        title="The Log"
      />
      <div style={{ padding: '20px 24px 0' }}>
        <LogFeed entries={log} plants={plants} scope="all" />
      </div>
    </div>
  );
}

// ─── You ───────────────────────────────────────────────────────

function YouScreen({ archetype, plants }) {
  const oldest = plants.reduce((a,b) => a.tendedDays > b.tendedDays ? a : b, plants[0]);
  const total = plants.reduce((s,p) => s + p.tendedDays, 0);
  return (
    <div className="paper-bg jj-fade" style={{ minHeight: '100%', paddingBottom: 80 }}>
      <div style={{ padding: '70px 24px 0', textAlign: 'left' }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: 'var(--ink-faint)', marginBottom: 12,
        }}>you are</div>
        <h1 style={{
          fontFamily: 'var(--serif)', fontStyle: 'italic',
          fontSize: 36, fontWeight: 400, lineHeight: 1.05,
          letterSpacing: '-0.015em',
          color: 'var(--ink)', margin: '0 0 14px',
        }}>{archetype?.name || 'A friend to plants'}</h1>
        <p style={{
          fontFamily: 'var(--serif)', fontSize: 17, lineHeight: 1.5,
          color: 'var(--ink-muted)', margin: 0, maxWidth: 320,
        }}>
          {archetype?.body || 'Tend at your own pace.'}
        </p>
      </div>

      <div style={{ padding: '36px 24px 0' }}>
        <div className="jj-card" style={{ padding: 20 }}>
          <Stat label="plants in your care" value={String(plants.length)} />
          <Divider />
          <Stat label="longest tended" value={`${oldest.name}, ${oldest.tendedDays} days`} />
          <Divider />
          <Stat label="time spent tending" value={`${total} plant-days`} />
        </div>
      </div>

      <div style={{ padding: '36px 24px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <YouLink label="Watering schedule" />
        <YouLink label="Notification preferences" />
        <YouLink label="Export your journal" />
        <YouLink label="About Jungle Jungle" />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0' }}>
      <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-muted)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)' }}>{value}</div>
    </div>
  );
}
function Divider() {
  return <div style={{ height: 1, background: 'var(--hairline)', margin: '4px 0' }} />;
}
function YouLink({ label }) {
  return (
    <button style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 0', borderBottom: '1px solid var(--hairline)',
      width: '100%', textAlign: 'left',
      fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)',
    }}>
      <span>{label}</span>
      <span style={{ color: 'var(--ink-faint)' }}>→</span>
    </button>
  );
}

Object.assign(window, {
  TodayScreen, GardenScreen, PlantDetailScreen,
  AddPlantScreen, LogScreen, YouScreen,
});

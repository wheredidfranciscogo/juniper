// Main app — routing, state, tab bar, tweaks
const { useState, useEffect } = React;

const TWEAKS_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "paper",
  "showProgress": true,
  "skipOnboarding": false,
  "startScreen": "today",
  "caughtUp": false,
  "name": "June"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAKS_DEFAULTS);
  const [route, setRoute] = useState({ name: 'splash' });
  const [tab, setTab] = useState('today');
  const [plants, setPlants] = useState(PLANTS_SEED);
  const [archetypeKey, setArchetypeKey] = useState(null);
  const [log, setLog] = useState(() => seedLog(PLANTS_SEED));

  // Allow skipping for design review
  useEffect(() => {
    if (t.skipOnboarding && route.name === 'splash') {
      setArchetypeKey('whisperer');
      setRoute({ name: 'main' });
      setTab(t.startScreen || 'today');
    }
    // Apply palette swap
    applyPalette(t.palette);
  }, [t.skipOnboarding, t.palette, t.startScreen]);

  const archetype = archetypeKey ? ARCHETYPES[archetypeKey] : null;

  function pushLog(plantId, kind, text) {
    const id = `${plantId}-${kind}-${Date.now()}`;
    setLog(l => [{ id, plantId, kind, text, when: Date.now() }, ...l]);
  }

  function handleWater(id) {
    const plant = plants.find(p => p.id === id);
    setPlants(plants.map(p =>
      p.id === id ? { ...p, daysSinceWater: 0 } : p
    ));
    if (plant) pushLog(id, 'water', `Watered ${plant.name}.`);
  }

  function handleAddNote(id, text) {
    setPlants(plants.map(p =>
      p.id === id
        ? { ...p, journal: [{ date: 'Today', text }, ...p.journal] }
        : p
    ));
    pushLog(id, 'note', text);
  }

  function handleLogAction(id, kind) {
    const plant = plants.find(p => p.id === id);
    if (!plant) return;
    const phrases = {
      repot:     `Repotted ${plant.name}.`,
      fertilize: `Fed ${plant.name} a measured dose.`,
      move:      `Moved ${plant.name} to a new spot.`,
    };
    pushLog(id, kind, phrases[kind] || `${kind} ${plant.name}.`);
  }

  function handleCaughtUp(on) {
    setPlants(plants.map(p => ({
      ...p,
      daysSinceWater: on ? Math.max(0, p.waterEvery - 2) : (PLANTS_SEED.find(s => s.id === p.id)?.daysSinceWater ?? p.daysSinceWater),
    })));
  }

  function openPlant(id) {
    setRoute({ name: 'plant', id });
  }

  function gotoTab(t) {
    setTab(t);
    setRoute({ name: 'main' });
  }

  const selectedPlant = route.name === 'plant'
    ? plants.find(p => p.id === route.id)
    : null;

  let screen;
  if (route.name === 'splash') {
    screen = <SplashScreen onEnter={() => setRoute({ name: 'onboarding' })} />;
  } else if (route.name === 'onboarding') {
    screen = <OnboardingScreen onDone={(picked) => {
      setArchetypeKey(picked || 'whisperer');
      setRoute({ name: 'main' });
    }} />;
  } else if (route.name === 'plant') {
    screen = <PlantDetailScreen plant={selectedPlant}
              onBack={() => setRoute({ name: 'main' })}
              onWater={handleWater}
              onAddNote={handleAddNote}
              onLogAction={handleLogAction}
              log={log} />;
  } else if (route.name === 'add') {
    screen = <AddPlantScreen
              onClose={() => setRoute({ name: 'main' })}
              onPicked={(v) => setRoute({ name: 'addEdit', path: v })} />;
  } else if (route.name === 'addEdit') {
    screen = <AddPlantEditScreen
              path={route.path}
              onCancel={() => setRoute({ name: 'main' })}
              onSave={(plant) => {
                setPlants([plant, ...plants]);
                setRoute({ name: 'plant', id: plant.id });
              }} />;
  } else {
    // main tabs
    if (tab === 'today') {
      screen = <TodayScreen plants={plants}
        onWater={handleWater}
        onOpenPlant={openPlant}
        onAdd={() => setRoute({ name: 'add' })}
        archetype={archetype}
        name={t.name} />;
    } else if (tab === 'garden') {
      screen = <GardenScreen plants={plants}
        onOpenPlant={openPlant}
        onAdd={() => setRoute({ name: 'add' })} />;
    } else if (tab === 'log') {
      screen = <LogScreen plants={plants} log={log} />;
    } else if (tab === 'you') {
      screen = <YouScreen archetype={archetype} plants={plants} />;
    }
  }

  const showTabBar = route.name === 'main';

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#2a2620',
    }}>
      <div style={{
        position: 'relative',
      }} data-screen-label={getScreenLabel(route, tab)}>
        <IOSDevice width={402} height={874}>
          <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {screen}
            </div>
            {showTabBar && (
              <TabBar tab={tab} setTab={setTab}
                onAdd={() => setRoute({ name: 'add' })} />
            )}
          </div>
        </IOSDevice>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Palette">
          <TweakRadio
            label="Mood"
            value={t.palette}
            onChange={(v) => setTweak('palette', v)}
            options={[
              { value: 'paper',  label: 'Paper' },
              { value: 'dusk',   label: 'Dusk' },
              { value: 'morning',label: 'Morning' },
            ]}
          />
        </TweakSection>
        <TweakSection label="Flow">
          <TweakText
            label="Your name"
            value={t.name}
            onChange={(v) => setTweak('name', v)}
          />
          <TweakToggle
            label="Skip onboarding"
            value={t.skipOnboarding}
            onChange={(v) => setTweak('skipOnboarding', v)}
          />
          <TweakToggle
            label="All caught up"
            value={t.caughtUp}
            onChange={(v) => { setTweak('caughtUp', v); handleCaughtUp(v); }}
          />
          <TweakSelect
            label="Start on screen"
            value={t.startScreen}
            onChange={(v) => { setTweak('startScreen', v); setTab(v); setRoute({ name: 'main' }); }}
            options={[
              { value: 'today',   label: 'Today' },
              { value: 'garden',  label: 'Garden' },
              { value: 'log',     label: 'Log' },
              { value: 'you',     label: 'You' },
            ]}
          />
        </TweakSection>
        <TweakSection label="Jump to">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <MiniJump label="Splash"     onClick={() => setRoute({ name: 'splash' })} />
            <MiniJump label="Onboarding" onClick={() => setRoute({ name: 'onboarding' })} />
            <MiniJump label="Today"      onClick={() => { setTab('today'); setRoute({ name: 'main' }); }} />
            <MiniJump label="Garden"     onClick={() => { setTab('garden'); setRoute({ name: 'main' }); }} />
            <MiniJump label="Plant"      onClick={() => setRoute({ name: 'plant', id: 'marcel' })} />
            <MiniJump label="Add"        onClick={() => setRoute({ name: 'add' })} />
            <MiniJump label="Log"        onClick={() => { setTab('log'); setRoute({ name: 'main' }); }} />
            <MiniJump label="You"        onClick={() => { setTab('you'); setRoute({ name: 'main' }); }} />
          </div>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

function MiniJump({ label, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 10px', borderRadius: 8,
      background: 'rgba(255,255,255,0.06)',
      color: 'rgba(255,255,255,0.85)',
      fontSize: 12, border: '1px solid rgba(255,255,255,0.08)',
      cursor: 'pointer',
    }}>{label}</button>
  );
}

function getScreenLabel(route, tab) {
  if (route.name === 'splash') return 'Splash';
  if (route.name === 'onboarding') return 'Onboarding';
  if (route.name === 'plant') return `Plant · ${route.id}`;
  if (route.name === 'add') return 'Add Plant';
  return `Tab · ${tab}`;
}

function applyPalette(name) {
  const r = document.documentElement;
  if (name === 'dusk') {
    r.style.setProperty('--paper', '#F1ECE0');
    r.style.setProperty('--surface', '#E8E1D1');
    r.style.setProperty('--ink', '#2A2520');
    r.style.setProperty('--clay', '#B86C50');
  } else if (name === 'morning') {
    r.style.setProperty('--paper', '#FCFBF7');
    r.style.setProperty('--surface', '#F8F5EC');
    r.style.setProperty('--ink', '#2D2A26');
    r.style.setProperty('--clay', '#D88060');
  } else {
    r.style.setProperty('--paper', '#FAF9F5');
    r.style.setProperty('--surface', '#F5F2EA');
    r.style.setProperty('--ink', '#2D2A26');
    r.style.setProperty('--clay', '#CC785C');
  }
}

// Tab bar — bottom nav
function TabBar({ tab, setTab, onAdd }) {
  const items = [
    { v: 'today',   label: 'Today',   Icon: IconHome },
    { v: 'garden',  label: 'Garden',  Icon: IconGarden },
    { v: 'add',     label: 'Add',     Icon: IconPlus, special: true },
    { v: 'log',     label: 'Log',     Icon: IconJournal },
    { v: 'you',     label: 'You',     Icon: IconLeaf },
  ];
  return (
    <div className="jj-tabbar" style={{ paddingBottom: 22 }}>
      {items.map(it => {
        const active = !it.special && tab === it.v;
        if (it.special) {
          return (
            <button key={it.v} onClick={onAdd} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 999,
                background: 'var(--clay)', color: '#FAF9F5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(204, 120, 92, 0.25)',
              }}>
                <it.Icon size={20} stroke={1.7} />
              </div>
            </button>
          );
        }
        return (
          <button key={it.v} className={active ? 'active' : ''} onClick={() => setTab(it.v)}>
            <it.Icon size={22} stroke={active ? 1.6 : 1.3} />
            <span>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

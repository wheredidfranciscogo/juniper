// Splash + Onboarding screens
// Renders inside the iOS device frame's content area.

function SplashScreen({ onEnter }) {
  return (
    <div className="paper-bg jj-fade" onClick={onEnter}
         style={{
           height: '100%', width: '100%',
           display: 'flex', flexDirection: 'column',
           alignItems: 'center', justifyContent: 'center',
           cursor: 'pointer', position: 'relative',
         }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        textAlign: 'center', paddingTop: 64,
        fontFamily: 'var(--mono)', fontSize: 10,
        letterSpacing: '0.22em', textTransform: 'uppercase',
        color: 'var(--ink-faint)',
      }}>est. mmxxvi</div>

      <div style={{ color: 'var(--moss)', marginBottom: 32 }}>
        <IconSeedling size={56} stroke={1.2} />
      </div>
      <div style={{
        fontFamily: 'var(--serif)', fontSize: 44, fontWeight: 400,
        letterSpacing: '-0.01em', lineHeight: 1, color: 'var(--ink)',
      }}>
        Jungle <span style={{ fontStyle: 'italic' }}>Jungle</span>
      </div>
      <div style={{
        marginTop: 16,
        fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink-muted)',
        letterSpacing: '0.01em',
      }}>
        A quiet place for your plants.
      </div>

      <div style={{
        position: 'absolute', bottom: 60, left: 0, right: 0,
        textAlign: 'center',
        fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink-faint)',
        letterSpacing: '0.04em',
      }}>
        tap anywhere to begin
      </div>
    </div>
  );
}

function OnboardingScreen({ onDone }) {
  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState({});
  const [revealed, setRevealed] = React.useState(false);

  const total = ONBOARDING.length;
  const isReveal = step >= total;

  function choose(key, value) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    setTimeout(() => {
      if (step + 1 >= total) {
        setStep(total);
        setTimeout(() => setRevealed(true), 320);
      } else {
        setStep(step + 1);
      }
    }, 220);
  }

  const archetypeKey = pickArchetype(answers);
  const archetype = ARCHETYPES[archetypeKey];

  // Progress
  const progress = isReveal ? 1 : (step / total);

  return (
    <div className="paper-bg" style={{
      height: '100%', width: '100%', position: 'relative',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* progress hairline at the very top, below status bar */}
      <div style={{ position: 'absolute', top: 54, left: 24, right: 24 }}>
        <div className="jj-progress">
          <span style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {/* back / step indicator */}
      {!isReveal && step > 0 && (
        <button onClick={() => setStep(step - 1)} style={{
          position: 'absolute', top: 70, left: 18,
          color: 'var(--ink-muted)', padding: 8,
        }}>
          <IconBack size={20} />
        </button>
      )}


      {!isReveal ? (
        <OnboardingStep key={step} q={ONBOARDING[step]} onChoose={(v) => choose(ONBOARDING[step].key, v)} />
      ) : (
        <RevealStep archetype={archetype} revealed={revealed} onDone={onDone} />
      )}
    </div>
  );
}

function OnboardingStep({ q, onChoose }) {
  const IconForName = {
    monstera: IconMonstera, leaf: IconLeaf, fern: IconFern,
    cactus: IconCactus, flower: IconFlower, herb: IconHerb,
    seedling: IconSeedling, sun: IconSun, sunPartial: IconSunPartial,
    window: IconWindow, watering: IconWatering, clock: IconClock,
    handWater: IconHandWater, sparkle: IconSparkle, drop: IconDrop,
    pencil: IconPencil, journal: IconJournal,
  };
  return (
    <div className="jj-fade" style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: '120px 24px 32px', overflow: 'auto',
    }}>
      <h1 style={{
        fontFamily: 'var(--serif)',
        fontSize: 30, lineHeight: 1.15, fontWeight: 400,
        letterSpacing: '-0.012em',
        color: 'var(--ink)', margin: '0 0 28px',
        textWrap: 'pretty',
      }}>
        {q.question}
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {q.options.map((opt) => {
          const I = IconForName[opt.icon] || IconLeaf;
          return (
            <button key={opt.v} onClick={() => onChoose(opt.v)}
              className="jj-card"
              style={{
                textAlign: 'left',
                padding: '16px 18px',
                display: 'flex', alignItems: 'center', gap: 14,
                transition: 'transform 240ms var(--ease), border-color 240ms var(--ease), background 240ms var(--ease)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--ink)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--hairline)'}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: 'var(--paper)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--moss)', flexShrink: 0,
                border: '1px solid var(--hairline)',
              }}>
                <I size={24} stroke={1.4} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: 'var(--sans)', fontSize: 16, fontWeight: 500,
                  color: 'var(--ink)', letterSpacing: '-0.005em',
                }}>{opt.label}</div>
                {opt.hint && (
                  <div style={{
                    fontFamily: 'var(--sans)', fontSize: 13,
                    color: 'var(--ink-muted)', marginTop: 2,
                  }}>{opt.hint}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RevealStep({ archetype, revealed, onDone }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '80px 28px 60px',
      textAlign: 'center', position: 'relative',
    }}>
      <div style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(8px)',
        transition: 'all 700ms var(--ease-long)',
      }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: 'var(--ink-faint)',
          marginBottom: 28,
        }}>
          we'd call you
        </div>

        <div style={{ color: 'var(--moss)', marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
          <IconFern size={44} stroke={1.2} />
        </div>

        <h1 style={{
          fontFamily: 'var(--serif)', fontStyle: 'italic',
          fontSize: 38, fontWeight: 400, lineHeight: 1.1,
          letterSpacing: '-0.015em',
          color: 'var(--ink)', margin: '0 0 18px',
          textWrap: 'balance',
        }}>
          {archetype.name}
        </h1>

        <p style={{
          fontFamily: 'var(--serif)', fontSize: 17, lineHeight: 1.5,
          color: 'var(--ink-muted)', margin: '0 0 8px',
          maxWidth: 280, textWrap: 'pretty',
        }}>
          {archetype.blurb}
        </p>

        <p style={{
          fontFamily: 'var(--sans)', fontSize: 14, lineHeight: 1.6,
          color: 'var(--ink-faint)', margin: '0 auto', maxWidth: 280,
          textWrap: 'pretty',
        }}>
          {archetype.body}
        </p>
      </div>

      <div style={{
        position: 'absolute', bottom: 60, left: 24, right: 24,
        opacity: revealed ? 1 : 0,
        transition: 'opacity 600ms var(--ease) 400ms',
      }}>
        <button className="jj-btn-clay" onClick={onDone}
          style={{ width: '100%', padding: '16px' }}>
          Begin
        </button>
      </div>
    </div>
  );
}

window.SplashScreen = SplashScreen;
window.OnboardingScreen = OnboardingScreen;

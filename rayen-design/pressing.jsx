// Plant photo placeholder — herbarium pressing aesthetic.
// Cream tile with a subtle line-art silhouette in moss/clay + species name.
// User can drop a real photo in via <image-slot> later.

function PlantPressing({ plant, ratio = '3/4', big = false, round = 0 }) {
  const IconForName = {
    monstera: IconMonstera, leaf: IconLeaf, fern: IconFern,
    cactus: IconCactus, flower: IconFlower, herb: IconHerb,
    seedling: IconSeedling,
  };
  const TheIcon = IconForName[plant.icon] || IconLeaf;
  const tone = plant.pressing || 'moss';
  const accentColor =
    tone === 'moss' ? 'rgba(45,55,40,0.42)' :
    tone === 'clay' ? 'rgba(135,70,50,0.32)' :
    tone === 'deep' ? 'rgba(230,225,210,0.55)' : 'rgba(45,55,40,0.4)';
  return (
    <div className={`jj-pressing ${tone}`} style={{
      aspectRatio: ratio,
      borderRadius: round,
      width: '100%',
      position: 'relative',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start',
      padding: big ? 22 : 12,
      color: accentColor,
    }}>
      {/* Big botanical silhouette top-right, like a pressed leaf */}
      <div style={{
        position: 'absolute',
        top: big ? '12%' : '14%',
        right: big ? '-8%' : '-12%',
        opacity: 1,
        transform: 'rotate(-12deg)',
      }}>
        <TheIcon size={big ? 360 : 180} stroke={big ? 1.1 : 1.3} />
      </div>
      {/* Hairline mark in corner — like a museum tag */}
      <div style={{
        position: 'absolute', top: big ? 18 : 12, left: big ? 18 : 12,
        fontFamily: 'var(--mono)', fontSize: big ? 10 : 9,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: tone === 'deep' ? 'rgba(245,242,234,0.6)' : 'rgba(45,42,38,0.4)',
      }}>
        № {plant.id.slice(0,3).toUpperCase()}
      </div>
      {/* Species name */}
      <div style={{
        position: 'relative',
        fontFamily: 'var(--serif)',
        fontStyle: 'italic',
        fontSize: big ? 22 : 14,
        color: tone === 'deep' ? 'rgba(245,242,234,0.85)' : 'rgba(45,42,38,0.55)',
        lineHeight: 1.15,
        maxWidth: '70%',
      }}>
        {plant.species}
      </div>
    </div>
  );
}

window.PlantPressing = PlantPressing;

/**
 * Combined add / edit screen.
 *
 *   ?path=photo   → capture/library buttons (identifier is stubbed) → manual form
 *   ?path=search  → Perenual species search → tap result to pre-fill → manual form
 *   ?path=manual  → blank form
 *   ?id=<plantId> → pre-fill from an existing plant; Save calls updatePlant
 *
 * Save is gated on name + species. New plants go through addPlant; existing
 * plants through updatePlant. Both flows redirect to /garden afterwards.
 */

import * as React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radii, spacing, text } from '../../theme';
import { useStore } from '../../lib/store';
import { IconByName, type PlantIconName } from '../../components/icons';
import type { PressingTone } from '../../components/Pressing';
import type { Plant } from '../../data/types';
import {
  hasPerenualKey,
  searchSpecies,
  sunlightToLight,
  wateringToDays,
  type SpeciesResult,
} from '../../lib/perenual';
import { captureFromCamera, pickFromLibrary } from '../../lib/image-picker';

type Path = 'photo' | 'search' | 'manual';

const ICON_OPTIONS: PlantIconName[] = [
  'leaf',
  'monstera',
  'fern',
  'cactus',
  'flower',
  'herb',
  'seedling',
];
const PRESSING_OPTIONS: PressingTone[] = ['moss', 'clay', 'deep'];
const LIGHT_OPTIONS = [
  'bright direct',
  'bright indirect',
  'dappled',
  'tolerates low',
  'full sun',
] as const;
const TEMP_OPTIONS = ['warm', 'any', 'cool'] as const;

const PATH_LABEL: Record<Path, string> = {
  photo: 'FROM A PHOTO',
  search: 'BY NAME',
  manual: 'BY HAND',
};

const newId = () => `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function AddEdit() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addPlant, updatePlant, plants } = useStore();
  const params = useLocalSearchParams<{ path?: string; id?: string }>();

  const editingPlant = params.id ? plants.find((p) => p.id === params.id) : undefined;
  const isEditing = Boolean(editingPlant);
  // While editing, suppress the photo/search panes — those are entry-point
  // affordances that don't make sense once the plant exists.
  const path: Path = isEditing
    ? 'manual'
    : params.path === 'photo' || params.path === 'search'
      ? params.path
      : 'manual';

  // Lazy initialisers seed the form from `editingPlant` when present without
  // re-seeding on every render.
  const [name, setName] = React.useState(() => editingPlant?.name ?? '');
  const [species, setSpecies] = React.useState(() => editingPlant?.species ?? '');
  const [nickname, setNickname] = React.useState(() => editingPlant?.nickname ?? '');
  const [waterEvery, setWaterEvery] = React.useState(() => editingPlant?.waterEvery ?? 7);
  const [light, setLight] = React.useState<string>(() => editingPlant?.light ?? 'bright indirect');
  const [temp, setTemp] = React.useState<string>(() => editingPlant?.temp ?? 'warm');
  const [icon, setIcon] = React.useState<PlantIconName>(() => editingPlant?.icon ?? 'leaf');
  const [pressing, setPressing] = React.useState<PressingTone>(() => editingPlant?.pressing ?? 'moss');
  const [photoUri, setPhotoUri] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const canSave = name.trim().length > 0 && species.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    if (editingPlant) {
      updatePlant(editingPlant.id, {
        name: name.trim(),
        species: species.trim(),
        nickname: nickname.trim() || undefined,
        pressing,
        icon,
        waterEvery,
        light,
        temp,
      });
    } else {
      const date = todayISO();
      const plant: Plant = {
        id: newId(),
        name: name.trim(),
        species: species.trim(),
        nickname: nickname.trim() || undefined,
        pressing,
        icon,
        waterEvery,
        // A new plant counts as watered now, so its first reminder lands one full
        // cadence away rather than immediately.
        lastWateredISO: new Date().toISOString(),
        light,
        temp,
        tendedDays: 0,
        addedISO: date,
        photos: photoUri ? [{ date, uri: photoUri }] : [],
        journal: [],
      };
      addPlant(plant);
    }
    setSaved(true);
  };

  // If an id was provided but no plant matches, bounce — likely a stale link.
  if (params.id && !editingPlant) return <Redirect href="/garden" />;
  if (saved) return <Redirect href="/garden" />;

  const fillFromSearch = (r: SpeciesResult) => {
    if (!name && r.commonName) setName(r.commonName);
    setSpecies(r.scientificName);
    setWaterEvery(wateringToDays(r.watering));
    setLight(sunlightToLight(r.sunlight));
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.overline}>{isEditing ? 'EDITING' : PATH_LABEL[path]}</Text>
        <Pressable onPress={handleSave} disabled={!canSave} hitSlop={10}>
          <Text style={[styles.save, !canSave && styles.saveDisabled]}>Save</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.section },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {path === 'photo' && <PhotoBlock photoUri={photoUri} onCapture={setPhotoUri} />}
        {path === 'search' && <SearchBlock onPick={fillFromSearch} />}

        <Field label="Name" value={name} onChangeText={setName} placeholder="Marcel" />
        <Field
          label="Species"
          value={species}
          onChangeText={setSpecies}
          placeholder="Monstera deliciosa"
          italic
        />
        <Field
          label="Nickname"
          value={nickname}
          onChangeText={setNickname}
          placeholder="optional"
        />

        <Stepper
          label={`Water every ${waterEvery} day${waterEvery === 1 ? '' : 's'}`}
          value={waterEvery}
          onChange={setWaterEvery}
          min={1}
          max={60}
        />

        <Segmented label="Light" options={LIGHT_OPTIONS} value={light} onChange={setLight} />
        <Segmented label="Temp" options={TEMP_OPTIONS} value={temp} onChange={setTemp} />

        <IconPicker value={icon} onChange={setIcon} />
        <PressingPicker value={pressing} onChange={setPressing} />
      </ScrollView>
    </View>
  );
}

/* ---------- Photo block ---------- */

function PhotoBlock({
  photoUri,
  onCapture,
}: {
  photoUri: string | null;
  onCapture: (uri: string | null) => void;
}) {
  const [busy, setBusy] = React.useState(false);

  const run = async (kind: 'camera' | 'library') => {
    setBusy(true);
    try {
      const uri = kind === 'camera' ? await captureFromCamera() : await pickFromLibrary();
      if (uri) onCapture(uri);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.block}>
      <Text style={styles.blockOverline}>A LIKENESS</Text>
      {photoUri ? (
        <View style={styles.photoWrap}>
          <Image source={{ uri: photoUri }} style={styles.photo} />
          <Pressable onPress={() => onCapture(null)} style={styles.photoRetake} hitSlop={6}>
            <Text style={styles.photoRetakeLabel}>Retake</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.photoActions}>
          <PhotoBtn label="Take photo" onPress={() => run('camera')} disabled={busy} />
          <PhotoBtn label="From library" onPress={() => run('library')} disabled={busy} />
        </View>
      )}
      <Text style={styles.blockHint}>
        Identification is a stub for now — fill in the details below.
      </Text>
    </View>
  );
}

function PhotoBtn({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.photoBtn,
        pressed && styles.photoBtnPressed,
        disabled && styles.photoBtnDisabled,
      ]}
    >
      <Text style={styles.photoBtnLabel}>{label}</Text>
    </Pressable>
  );
}

/* ---------- Search block ---------- */

function SearchBlock({ onPick }: { onPick: (r: SpeciesResult) => void }) {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SpeciesResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const hasKey = hasPerenualKey();

  React.useEffect(() => {
    if (!hasKey) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await searchSpecies(q, ctrl.signal);
        setResults(r);
      } catch (e) {
        if ((e as { name?: string }).name !== 'AbortError') {
          setError('Could not reach Perenual.');
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 320);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, hasKey]);

  return (
    <View style={styles.block}>
      <Text style={styles.blockOverline}>FIND THEIR NAME</Text>
      <TextInput
        style={styles.searchInput}
        value={query}
        onChangeText={setQuery}
        placeholder="Monstera, ficus, basil..."
        placeholderTextColor={colors.inkFaint}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {!hasKey && (
        <Text style={styles.blockHint}>
          Add EXPO_PUBLIC_PERENUAL_KEY to .env to enable search, or skip and add by hand.
        </Text>
      )}
      {loading && <ActivityIndicator color={colors.moss} style={styles.searchSpinner} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {results.map((r) => (
        <Pressable
          key={r.id}
          onPress={() => onPick(r)}
          style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
        >
          <View style={styles.resultText}>
            <Text style={styles.resultName}>{r.commonName || r.scientificName}</Text>
            {r.commonName && r.scientificName ? (
              <Text style={styles.resultSpecies}>{r.scientificName}</Text>
            ) : null}
          </View>
          <Text style={styles.resultHint}>tap to fill</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ---------- Reusable form pieces ---------- */

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  italic,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  italic?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, italic && styles.inputItalic]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
      />
    </View>
  );
}

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable
          onPress={() => onChange(Math.max(min, value - 1))}
          style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperBtnPressed]}
          accessibilityLabel="decrement"
        >
          <Text style={styles.stepperSign}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          style={({ pressed }) => [styles.stepperBtn, pressed && styles.stepperBtnPressed]}
          accessibilityLabel="increment"
        >
          <Text style={styles.stepperSign}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.segWrap}>
        {options.map((opt) => {
          const active = value === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={[styles.seg, active && styles.segActive]}
            >
              <Text style={[styles.segLabel, active && styles.segLabelActive]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function IconPicker({
  value,
  onChange,
}: {
  value: PlantIconName;
  onChange: (v: PlantIconName) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>Icon</Text>
      <View style={styles.iconRow}>
        {ICON_OPTIONS.map((name) => {
          const Icon = IconByName[name];
          const active = value === name;
          return (
            <Pressable
              key={name}
              onPress={() => onChange(name)}
              accessibilityLabel={`icon-${name}`}
              style={[styles.iconCell, active && styles.iconCellActive]}
            >
              <Icon size={22} color={active ? colors.ink : colors.inkMuted} stroke={1.4} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function PressingPicker({
  value,
  onChange,
}: {
  value: PressingTone;
  onChange: (v: PressingTone) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>Pressing</Text>
      <View style={styles.segWrap}>
        {PRESSING_OPTIONS.map((opt) => {
          const active = value === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={[styles.seg, active && styles.segActive]}
            >
              <Text style={[styles.segLabel, active && styles.segLabelActive]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  overline: text.overline,
  cancel: { ...text.ghostButton, color: colors.inkMuted },
  save: { ...text.ghostButton, color: colors.clay },
  saveDisabled: { color: colors.inkFaint },

  scroll: { padding: spacing.page, gap: spacing.lg },

  block: { gap: 10 },
  blockOverline: text.overlineMd,
  blockHint: { ...text.hint, marginTop: 4 },

  photoActions: { flexDirection: 'row', gap: 12 },
  photoBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    alignItems: 'center',
  },
  photoBtnPressed: { borderColor: colors.ink, backgroundColor: colors.surface2 },
  photoBtnDisabled: { opacity: 0.5 },
  photoBtnLabel: text.ghostButton,

  photoWrap: { gap: 8 },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  photoRetake: { alignSelf: 'flex-start' },
  photoRetakeLabel: { ...text.ghostButton, color: colors.clay },

  searchInput: {
    ...text.bodyMuted,
    color: colors.ink,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  searchSpinner: { marginTop: 8 },
  error: { ...text.hint, color: colors.clay, marginTop: 8 },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    gap: 12,
  },
  resultRowPressed: { backgroundColor: colors.surface },
  resultText: { flex: 1, gap: 2 },
  resultName: { fontFamily: fonts.serif.regular, fontSize: 16, color: colors.ink },
  resultSpecies: { ...text.species, fontStyle: 'italic', fontSize: 13 },
  resultHint: { ...text.monoTimestamp, color: colors.inkFaint },

  field: { gap: 6 },
  fieldLabel: { ...text.overlineSm, color: colors.inkMuted },
  input: {
    ...text.bodyMuted,
    color: colors.ink,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineStrong,
  },
  inputItalic: { fontFamily: fonts.serif.regularItalic },

  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnPressed: { backgroundColor: colors.surface },
  stepperSign: {
    fontFamily: fonts.sans.regular,
    fontSize: 22,
    color: colors.ink,
    lineHeight: 24,
  },
  stepperValue: {
    fontFamily: fonts.serif.regular,
    fontSize: 22,
    color: colors.ink,
    minWidth: 36,
    textAlign: 'center',
  },

  segWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  seg: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  segActive: { borderColor: colors.ink, backgroundColor: colors.surface },
  segLabel: { fontFamily: fonts.sans.regular, fontSize: 13, color: colors.inkMuted },
  segLabelActive: { color: colors.ink },

  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  iconCell: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconCellActive: { borderColor: colors.ink, backgroundColor: colors.surface },
});

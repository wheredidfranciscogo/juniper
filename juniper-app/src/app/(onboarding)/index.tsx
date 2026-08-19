/**
 * Onboarding — two screens, and only because each one configures something.
 *
 * It used to be seven: five personality questions, a name, and an archetype reveal that
 * christened you "The Plant Whisperer". None of it changed how the app behaved. The rule
 * now is simply: if an answer doesn't set something up, don't ask it.
 *
 *   1. Name      → the Today greeting
 *   2. Reminders → permission and the daily time, so watering reminders work from day one
 *
 * The permission prompt lives on step 2 rather than at launch: asked cold on a first
 * screen it gets denied, and iOS only lets you ask once.
 */

import * as React from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, text, radii, BEZIER_BASE, duration } from '../../theme';
import { IconBack } from '../../components/icons';
import { useStore } from '../../lib/store';
import { DEFAULT_TIME, setReminder } from '../../lib/notifications';
import { plantsSeed } from '../../data/seed';

const TOTAL_STEPS = 2;

/** The same six slots the You tab offers, so there is one idea of "reminder time". */
const TIME_OPTIONS = ['07:00', '08:00', '09:00', '12:00', '18:00', '20:00'];

function prettyTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  const suffix = h < 12 ? 'am' : 'pm';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour}${suffix}` : `${hour}:${String(m).padStart(2, '0')}${suffix}`;
}

export default function OnboardingFlow() {
  const insets = useSafeAreaInsets();
  const store = useStore();

  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState('');
  const [time, setTime] = React.useState(DEFAULT_TIME);
  const [busy, setBusy] = React.useState(false);

  const progress = React.useRef(new Animated.Value(1 / TOTAL_STEPS)).current;
  React.useEffect(() => {
    Animated.timing(progress, {
      toValue: (step + 1) / TOTAL_STEPS,
      duration: duration.progress,
      easing: Easing.bezier(...BEZIER_BASE),
      useNativeDriver: false,
    }).start();
  }, [step, progress]);

  /**
   * Finish. The garden starts with one lived-in example plant rather than six demos or
   * an empty screen — enough to show what the app looks like in use, not enough to have
   * to clear out before adding your own.
   */
  const finish = async (withReminders: boolean) => {
    setBusy(true);
    try {
      if (withReminders) {
        // Ask before the store flips `onboarded`, so the prompt appears over this
        // screen rather than over a Today screen sliding in behind it.
        await setReminder(true, { time, plants: plantsSeed() });
      }
      store.completeOnboarding({ userName: name.trim(), seed: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
          ]}
        />
      </View>

      {step > 0 && (
        <Pressable onPress={() => setStep(step - 1)} style={styles.back} hitSlop={12}>
          <IconBack size={20} color={colors.inkMuted} />
        </Pressable>
      )}

      <View style={styles.body}>
        {step === 0 ? (
          <NameStep name={name} onChange={setName} onContinue={() => setStep(1)} />
        ) : (
          <ReminderStep
            time={time}
            onPickTime={setTime}
            busy={busy}
            onEnable={() => finish(true)}
            onSkip={() => finish(false)}
          />
        )}
      </View>
    </View>
  );
}

function NameStep({
  name,
  onChange,
  onContinue,
}: {
  name: string;
  onChange: (v: string) => void;
  onContinue: () => void;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.overline}>FIRST</Text>
      <Text style={styles.question}>What should we call you?</Text>
      <TextInput
        value={name}
        onChangeText={onChange}
        placeholder="your name"
        placeholderTextColor={colors.inkFaint}
        style={styles.input}
        autoFocus
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={onContinue}
      />
      <Pressable
        onPress={onContinue}
        style={({ pressed }) => [styles.clayBtn, pressed && styles.clayBtnPressed]}
      >
        <Text style={styles.clayBtnLabel}>Continue</Text>
      </Pressable>
      <Text style={styles.hint}>Only used to say hello.</Text>
    </View>
  );
}

function ReminderStep({
  time,
  onPickTime,
  busy,
  onEnable,
  onSkip,
}: {
  time: string;
  onPickTime: (t: string) => void;
  busy: boolean;
  onEnable: () => void;
  onSkip: () => void;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.overline}>AND</Text>
      <Text style={styles.question}>Shall we remind you when to water?</Text>
      <Text style={styles.blurb}>
        A quiet nudge, only on the days a plant is actually due. Nothing leaves your phone.
      </Text>

      <Text style={styles.label}>At what time?</Text>
      <View style={styles.chips}>
        {TIME_OPTIONS.map((option) => {
          const active = option === time;
          return (
            <Pressable
              key={option}
              onPress={() => onPickTime(option)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                {prettyTime(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={onEnable}
        disabled={busy}
        style={({ pressed }) => [styles.clayBtn, pressed && styles.clayBtnPressed]}
      >
        <Text style={styles.clayBtnLabel}>Remind me at {prettyTime(time)}</Text>
      </Pressable>

      <Pressable onPress={onSkip} disabled={busy} hitSlop={8}>
        <Text style={styles.skip}>Not now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  progressTrack: { height: 1, backgroundColor: colors.hairline, width: '100%' },
  progressFill: { height: 1, backgroundColor: colors.ink },
  back: { position: 'absolute', top: 56, left: spacing.page, zIndex: 2 },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.page },
  step: { gap: spacing.base },

  overline: text.overline,
  question: { ...text.question, marginBottom: spacing.xs },
  blurb: { ...text.blurb, color: colors.inkMuted },
  label: { ...text.hint, marginTop: spacing.md },

  input: {
    ...text.question,
    fontSize: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineStrong,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.paper,
  },
  chipActive: { backgroundColor: colors.moss, borderColor: colors.moss },
  chipLabel: { ...text.hint, color: colors.ink },
  chipLabelActive: { color: colors.paper },

  clayBtn: {
    backgroundColor: colors.clay,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  clayBtnPressed: { backgroundColor: colors.clayDeep, transform: [{ scale: 0.98 }] },
  clayBtnLabel: { ...text.button },
  skip: { ...text.hint, textAlign: 'center', paddingVertical: spacing.md },
  hint: { ...text.hint, textAlign: 'center' },
});

/**
 * Onboarding flow.
 * 5 questions → name capture → archetype reveal → "Begin" routes to /(tabs)/today.
 *
 * Internal state for `step` (0–6). Progress hairline at top. Back chevron from step 1.
 * Per the handoff: no percentages, no step counter, just the line filling.
 */

import * as React from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, text, radii, BEZIER_BASE, duration } from '../../theme';
import { ONBOARDING, ARCHETYPES, pickArchetype } from '../../data/seed';
import type { OnboardingAnswers } from '../../data/types';
import { AllIcons, IconBack, IconFern, type IconName } from '../../components/icons';
import { useStore } from '../../lib/store';

const TOTAL_STEPS = ONBOARDING.length + 2; // questions + name + reveal

export default function OnboardingFlow() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const store = useStore();

  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<OnboardingAnswers>({});
  const [name, setName] = React.useState('');

  // Progress hairline — animated fill width
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / TOTAL_STEPS,
      duration: duration.progress,
      easing: Easing.bezier(...BEZIER_BASE),
      useNativeDriver: false,
    }).start();
  }, [progressAnim, step]);

  const isQuestion = step < ONBOARDING.length;
  const isNameStep = step === ONBOARDING.length;
  const isReveal = step === ONBOARDING.length + 1;

  const archetypeKey = React.useMemo(() => pickArchetype(answers), [answers]);
  const archetype = ARCHETYPES[archetypeKey];

  const handleOption = (key: string, value: string) => {
    setAnswers((a) => ({ ...a, [key]: value }));
    setTimeout(() => setStep((s) => s + 1), 220);
  };

  const handleBegin = () => {
    // Just flip the store flag — the root layout's Stack.Protected guards
    // remove (onboarding) and expose (tabs), so the router handles routing.
    store.completeOnboarding({
      userName: name.trim() || 'Friend',
      archetype: archetypeKey,
      seed: true,
    });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      {/* Progress hairline */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
          ]}
        />
      </View>

      {/* Back chevron */}
      {step > 0 && !isReveal && (
        <Pressable
          onPress={() => setStep((s) => Math.max(0, s - 1))}
          style={styles.back}
          hitSlop={12}
        >
          <IconBack size={22} color={colors.ink} />
        </Pressable>
      )}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {isQuestion && <QuestionStep step={ONBOARDING[step]} onPick={handleOption} />}
        {isNameStep && <NameStep value={name} onChange={setName} onNext={() => setStep((s) => s + 1)} />}
        {isReveal && <RevealStep name={archetype.name} blurb={archetype.blurb} body={archetype.body} onBegin={handleBegin} />}
      </ScrollView>
    </View>
  );
}

/* ---------- Sub-components ---------- */

function QuestionStep({
  step,
  onPick,
}: {
  step: (typeof ONBOARDING)[number];
  onPick: (key: string, v: string) => void;
}) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.question}>{step.question}</Text>
      <View style={styles.optionStack}>
        {step.options.map((opt) => {
          const Icon = (AllIcons as Record<string, React.FC<{ size?: number; color?: string; stroke?: number }>>)[opt.icon];
          return (
            <Pressable
              key={opt.v}
              onPress={() => onPick(step.key, opt.v)}
              style={({ pressed }) => [styles.optionCard, pressed && styles.optionCardPressed]}
            >
              <View style={styles.optionIcon}>
                {Icon ? <Icon size={26} color={colors.moss} /> : null}
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionLabel}>{opt.label}</Text>
                {opt.hint ? <Text style={styles.optionHint}>{opt.hint}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function NameStep({
  value,
  onChange,
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.question}>And what should we call you?</Text>
      <Text style={styles.hint}>A first name is plenty. You can change it later.</Text>
      <TextInput
        style={styles.nameInput}
        value={value}
        onChangeText={onChange}
        placeholder="June"
        placeholderTextColor={colors.inkFaint}
        autoFocus
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={onNext}
      />
      <Pressable
        onPress={onNext}
        style={({ pressed }) => [styles.clayBtn, pressed && styles.clayBtnPressed]}
        disabled={!value.trim()}
      >
        <Text style={styles.clayBtnLabel}>Continue</Text>
      </Pressable>
    </View>
  );
}

function RevealStep({
  name,
  blurb,
  body,
  onBegin,
}: {
  name: string;
  blurb: string;
  body: string;
  onBegin: () => void;
}) {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(8)).current;
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 700, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View style={[styles.revealContainer, { opacity, transform: [{ translateY }] }]}>
      <Text style={styles.revealOverline}>we'd call you</Text>
      <IconFern size={44} color={colors.moss} stroke={1.3} />
      <Text style={styles.revealName}>{name}</Text>
      <Text style={styles.revealBlurb}>{blurb}</Text>
      <Text style={styles.revealBody}>{body}</Text>
      <Pressable
        onPress={onBegin}
        style={({ pressed }) => [styles.clayBtn, styles.revealBtn, pressed && styles.clayBtnPressed]}
      >
        <Text style={styles.clayBtnLabel}>Begin</Text>
      </Pressable>
    </Animated.View>
  );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },

  progressTrack: {
    height: 1,
    backgroundColor: colors.hairline,
    marginHorizontal: spacing.page,
  },
  progressFill: { height: 1, backgroundColor: colors.ink },

  back: {
    position: 'absolute',
    top: 36,
    left: spacing.page,
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  scroll: { paddingHorizontal: spacing.page, paddingTop: spacing.section + 8 },
  stepContainer: { gap: spacing.lg, paddingTop: 24 },

  question: { ...text.question },

  optionStack: { gap: 10, marginTop: 8 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  optionCardPressed: { borderColor: colors.ink, backgroundColor: colors.surface2 },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { ...text.optionLabel },
  optionHint: { ...text.cardHint },

  hint: { ...text.hint, marginTop: -8 },
  nameInput: {
    ...text.plantHero,
    fontSize: 32,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineStrong,
    color: colors.ink,
    fontFamily: 'SourceSerif4_400Regular_Italic',
  },

  clayBtn: {
    backgroundColor: colors.clay,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  clayBtnPressed: { backgroundColor: colors.clayDeep, transform: [{ scale: 0.98 }] },
  clayBtnLabel: { ...text.button },

  revealContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.section * 2,
    gap: 18,
  },
  revealOverline: { ...text.overline, color: colors.inkFaint },
  revealName: { ...text.archetypeTitle, textAlign: 'center', marginTop: 4 },
  revealBlurb: { ...text.blurb, textAlign: 'center', maxWidth: 320 },
  revealBody: { ...text.bodyMuted, textAlign: 'center', maxWidth: 320, lineHeight: 22 },
  revealBtn: { alignSelf: 'stretch', marginTop: 18 },
});

/**
 * SensorMonitorScreen — real-time live sensor display
 *
 * All values stream from the hardware (or synthetic oscillating data on
 * emulators) via useLiveSensors. There is NO static placeholder data.
 */

import React, { useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, StatusBar, Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { textStyles, fontSizes, fontWeights } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';
import { GlassCard } from '../components/GlassCard';
import { SectionHeader } from '../components/SectionHeader';
import { useLiveSensors } from '../hooks/useLiveSensors';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function headingToDirection(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function fmt(v: number | null | undefined, decimals = 3): string {
  if (v === null || v === undefined) return '--';
  return v.toFixed(decimals);
}

// ─── Live Pulsing Dot ─────────────────────────────────────────────────────────
function LiveDot({ active, color }: { active: boolean; color: string }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.4, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [active]);

  return (
    <Animated.View
      style={{
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: active ? color : colors.gray300,
        transform: [{ scale: active ? pulse : 1 }],
      }}
    />
  );
}

// ─── Animated Value Cell ──────────────────────────────────────────────────────
function ValueCell({ label, value, unit, color = colors.primary }: {
  label: string; value: string; unit?: string; color?: string;
}) {
  const flashAnim = useRef(new Animated.Value(1)).current;
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      prevValue.current = value;
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 0.55, duration: 80, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 1,    duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [value]);

  return (
    <View style={vcStyles.cell}>
      <Text style={vcStyles.label}>{label}</Text>
      <Animated.Text style={[vcStyles.value, { color, opacity: flashAnim }]}>
        {value}<Text style={vcStyles.unit}> {unit}</Text>
      </Animated.Text>
    </View>
  );
}

const vcStyles = StyleSheet.create({
  cell: { alignItems: 'center', flex: 1, gap: 2 },
  label: { fontSize: 9, fontWeight: fontWeights.bold, color: colors.textTertiary, letterSpacing: 0.8, textTransform: 'uppercase' },
  value: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, letterSpacing: -0.4 },
  unit:  { fontSize: 10, color: colors.textTertiary, fontWeight: fontWeights.normal },
});

// ─── Sensor Card ──────────────────────────────────────────────────────────────
function LiveSensorCard({ title, unit, x, y, z, color, isActive }: {
  title: string; unit: string;
  x?: number | null; y?: number | null; z?: number | null;
  color: string; isActive: boolean;
}) {
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.header}>
        <LiveDot active={isActive} color={color} />
        <Text style={[cardStyles.title, { color: isActive ? colors.textPrimary : colors.textTertiary }]}>{title}</Text>
        <Text style={cardStyles.unit}>{unit}</Text>
      </View>
      <View style={cardStyles.axisRow}>
        <ValueCell label="X" value={fmt(x)} color={color} />
        <View style={cardStyles.axisDiv} />
        <ValueCell label="Y" value={fmt(y)} color={color} />
        <View style={cardStyles.axisDiv} />
        <ValueCell label="Z" value={fmt(z)} color={color} />
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
    gap: spacing[4],
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  title:  { ...textStyles.labelMedium, flex: 1, textTransform: 'uppercase', letterSpacing: 1 },
  unit:   { ...textStyles.caption, color: colors.textTertiary },
  axisRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  axisDiv:{ width: 1, height: 32, backgroundColor: colors.borderLight },
});

// ─── GNSS Card ────────────────────────────────────────────────────────────────
function GNSSLiveCard({ gnss, hasReal }: { gnss: any; hasReal: boolean }) {
  const active = !!gnss;

  const fields = gnss ? [
    { label: 'Latitude',   value: gnss.latitude.toFixed(6),          unit: '°' },
    { label: 'Longitude',  value: gnss.longitude.toFixed(6),         unit: '°' },
    { label: 'Altitude',   value: gnss.altitude?.toFixed(1) ?? '--', unit: 'm' },
    { label: 'Speed',      value: gnss.speed?.toFixed(1) ?? '--',    unit: 'km/h' },
    { label: 'Accuracy',   value: gnss.accuracy?.toFixed(1) ?? '--', unit: 'm' },
    { label: 'Heading',    value: gnss.heading?.toFixed(0) ?? '--',  unit: '°' },
  ] : [];

  return (
    <View style={[gnssStyles.card, active && gnssStyles.cardActive]}>
      <View style={gnssStyles.header}>
        <LiveDot active={active} color={colors.gnssActive} />
        <Text style={gnssStyles.title}>GNSS / GPS</Text>
        <View style={[gnssStyles.badge, { backgroundColor: active ? colors.gnssActiveSurface : colors.gray100 }]}>
          <Text style={[gnssStyles.badgeText, { color: active ? colors.gnssActive : colors.textTertiary }]}>
            {active ? (hasReal ? 'LIVE' : 'SIM') : 'NO SIGNAL'}
          </Text>
        </View>
      </View>

      {active ? (
        <View style={gnssStyles.grid}>
          {fields.map(f => (
            <View key={f.label} style={gnssStyles.field}>
              <Text style={gnssStyles.fieldLabel}>{f.label}</Text>
              <Text style={gnssStyles.fieldValue}>
                {f.value}<Text style={gnssStyles.fieldUnit}> {f.unit}</Text>
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={gnssStyles.noSignal}>Waiting for GPS signal…</Text>
      )}
    </View>
  );
}

const gnssStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
    gap: spacing[4],
  },
  cardActive: { borderColor: `${colors.gnssActive}33` },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  title: { ...textStyles.labelMedium, color: colors.textPrimary, flex: 1, textTransform: 'uppercase', letterSpacing: 1 },
  badge: { paddingHorizontal: spacing[2], paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: 9, fontWeight: fontWeights.bold, letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  field: { width: '45%', gap: 2 },
  fieldLabel: { ...textStyles.caption, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue: { ...textStyles.labelLarge, color: colors.textPrimary },
  fieldUnit: { ...textStyles.caption, color: colors.textTertiary },
  noSignal: { ...textStyles.bodySmall, color: colors.textTertiary, fontStyle: 'italic' },
});

// ─── Heading Card ─────────────────────────────────────────────────────────────
function HeadingCard({ heading, pitch, roll, isActive }: {
  heading: number; pitch: number; roll: number; isActive: boolean;
}) {
  const direction = headingToDirection(heading);
  const rotAnim = useRef(new Animated.Value(heading)).current;

  useEffect(() => {
    Animated.timing(rotAnim, {
      toValue: heading,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [heading]);

  return (
    <View style={[cardStyles.card, { flexDirection: 'row', alignItems: 'center', gap: spacing[4] }]}>
      {/* Compass rose */}
      <View style={headStyles.compassContainer}>
        <Animated.View style={[headStyles.compass, {
          transform: [{ rotate: rotAnim.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }],
        }]}>
          <Text style={headStyles.compassN}>N</Text>
          <View style={headStyles.needleUp} />
          <View style={headStyles.needleDown} />
          <Text style={headStyles.compassS}>S</Text>
        </Animated.View>
      </View>

      {/* Values */}
      <View style={{ flex: 1, gap: spacing[3] }}>
        <View style={cardStyles.header}>
          <LiveDot active={isActive} color={colors.deadReckoning} />
          <Text style={[cardStyles.title, { color: colors.textPrimary }]}>HEADING / ORIENTATION</Text>
        </View>
        <View style={headStyles.values}>
          <ValueCell label="Heading" value={`${heading.toFixed(1)}°`} color={colors.deadReckoning} />
          <ValueCell label="Direction" value={direction} color={colors.deadReckoning} />
        </View>
        <View style={headStyles.values}>
          <ValueCell label="Pitch" value={`${pitch.toFixed(1)}°`} color={colors.secondary} />
          <ValueCell label="Roll"  value={`${roll.toFixed(1)}°`}  color={colors.secondary} />
        </View>
      </View>
    </View>
  );
}

const headStyles = StyleSheet.create({
  compassContainer: { width: 70, height: 70, alignItems: 'center', justifyContent: 'center' },
  compass: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  compassN: { fontSize: 11, fontWeight: fontWeights.bold, color: colors.black, marginBottom: 2 },
  compassS: { fontSize: 10, fontWeight: fontWeights.semibold, color: colors.textTertiary, marginTop: 2 },
  needleUp: { width: 3, height: 18, backgroundColor: colors.black, borderRadius: 2 },
  needleDown: { width: 3, height: 14, backgroundColor: colors.textTertiary, borderRadius: 2, marginTop: 1 },
  values: { flexDirection: 'row', gap: spacing[2] },
});

// ─── Sensor Health Row ────────────────────────────────────────────────────────
function HealthRow({ label, active, isReal }: { label: string; active: boolean; isReal: boolean }) {
  return (
    <View style={healthStyles.row}>
      <Text style={healthStyles.label}>{label}</Text>
      <View style={healthStyles.right}>
        <Text style={[healthStyles.status, { color: active ? colors.gnssActive : colors.textTertiary }]}>
          {active ? (isReal ? 'LIVE' : 'SIMULATED') : 'OFFLINE'}
        </Text>
        <LiveDot active={active} color={isReal ? colors.gnssActive : colors.secondary} />
      </View>
    </View>
  );
}

const healthStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  label:  { ...textStyles.bodyMedium, color: colors.textPrimary, fontWeight: fontWeights.medium },
  right:  { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  status: { ...textStyles.bodySmall, fontWeight: fontWeights.semibold },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export function SensorMonitorScreen() {
  const { imu, gnss, hasRealSensors, hasRealGNSS } = useLiveSensors();

  const heading = imu?.heading ?? 0;
  const pitch   = imu?.pitch   ?? 0;
  const roll    = imu?.roll    ?? 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader
          title="Sensor Monitor"
          subtitle={imu ? `Live · ${hasRealSensors ? 'Hardware sensors' : 'Synthetic stream'}` : 'Initialising sensors…'}
        />

        {/* GNSS */}
        <GNSSLiveCard gnss={gnss} hasReal={hasRealGNSS} />

        {/* Accelerometer */}
        <LiveSensorCard
          title="Accelerometer" unit="m/s²"
          x={imu?.accelerometer?.x} y={imu?.accelerometer?.y} z={imu?.accelerometer?.z}
          color={colors.primary} isActive={!!imu}
        />

        {/* Gyroscope */}
        <LiveSensorCard
          title="Gyroscope" unit="rad/s"
          x={imu?.gyroscope?.x} y={imu?.gyroscope?.y} z={imu?.gyroscope?.z}
          color={colors.secondary} isActive={!!imu}
        />

        {/* Magnetometer */}
        <LiveSensorCard
          title="Magnetometer" unit="μT"
          x={imu?.magnetometer?.x} y={imu?.magnetometer?.y} z={imu?.magnetometer?.z}
          color={colors.gnssActive} isActive={!!imu}
        />

        {/* Heading / Orientation */}
        <HeadingCard
          heading={heading} pitch={pitch} roll={roll} isActive={!!imu}
        />

        {/* Sensor Health */}
        <GlassCard elevated>
          <Text style={styles.healthTitle}>Sensor Health</Text>
          <HealthRow label="GNSS / GPS"    active={!!gnss} isReal={hasRealGNSS} />
          <HealthRow label="Accelerometer" active={!!imu}  isReal={hasRealSensors} />
          <HealthRow label="Gyroscope"     active={!!imu}  isReal={hasRealSensors} />
          <HealthRow label="Magnetometer"  active={!!imu}  isReal={hasRealSensors} />
        </GlassCard>

        {!hasRealSensors && (
          <View style={styles.simNote}>
            <Feather name="info" size={14} color={colors.primary} />
            <Text style={styles.simNoteText}>
              Running synthetic sensor stream — real hardware sensors unavailable on this device.
              All values animate continuously so you can verify the UI updates in real-time.
            </Text>
          </View>
        )}

        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  scroll:  { flex: 1 },
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[10],
    gap: spacing[4],
  },
  healthTitle: {
    ...textStyles.headingSmall,
    color: colors.textPrimary,
    marginBottom: spacing[2],
  },
  simNote: {
    flexDirection: 'row',
    gap: spacing[2],
    backgroundColor: colors.warningSurface,
    padding: spacing[4],
    borderRadius: radius.lg,
    alignItems: 'flex-start',
  },
  simNoteIcon: { fontSize: 16 },
  simNoteText: { ...textStyles.bodySmall, color: colors.textSecondary, flex: 1, lineHeight: 20 },
});

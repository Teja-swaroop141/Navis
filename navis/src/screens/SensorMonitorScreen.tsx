/**
 * SensorMonitorScreen — live display of all IMU sensor readings
 */

import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, StatusBar,
} from 'react-native';
import { colors } from '../theme/colors';
import { textStyles, fontSizes, fontWeights } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';
import { useNavigation } from '../state/NavigationContext';
import { SensorCard, headingToDirection } from '../components/SensorCard';
import { GlassCard } from '../components/GlassCard';
import { SectionHeader } from '../components/SectionHeader';

function HealthRow({ label, active, simulated }: { label: string; active: boolean; simulated?: boolean }) {
  const dotColor = active ? colors.gnssActive : colors.gray300;
  const statusText = active ? (simulated ? 'Simulated' : 'Active') : 'Offline';

  return (
    <View style={healthStyles.row}>
      <Text style={healthStyles.label}>{label}</Text>
      <View style={healthStyles.right}>
        <Text style={[healthStyles.status, { color: active ? colors.gnssActive : colors.textTertiary }]}>
          {statusText}
        </Text>
        <View style={[healthStyles.dot, { backgroundColor: dotColor }]} />
      </View>
    </View>
  );
}

const healthStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  label: { ...textStyles.bodyMedium, color: colors.textPrimary, fontWeight: fontWeights.medium },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  status: { ...textStyles.bodySmall, fontWeight: fontWeights.semibold },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

// GNSS card
function GNSSCard({ data }: { data: any }) {
  const fields = [
    { label: 'Latitude', value: data?.latitude?.toFixed(6) ?? '--', unit: '°' },
    { label: 'Longitude', value: data?.longitude?.toFixed(6) ?? '--', unit: '°' },
    { label: 'Altitude', value: data?.altitude?.toFixed(1) ?? '--', unit: 'm' },
    { label: 'Speed', value: data?.speed ? (data.speed * 3.6).toFixed(1) : '--', unit: 'km/h' },
    { label: 'Accuracy', value: data?.accuracy?.toFixed(1) ?? '--', unit: 'm' },
    { label: 'Satellites', value: data?.satelliteCount ?? '--', unit: '' },
  ];

  return (
    <View style={gnssStyles.card}>
      <View style={gnssStyles.header}>
        <View style={[gnssStyles.dot, { backgroundColor: data ? colors.gnssActive : colors.gray300 }]} />
        <Text style={gnssStyles.title}>GNSS / GPS</Text>
        <View style={[gnssStyles.badge, { backgroundColor: data ? colors.gnssActiveSurface : colors.gray100 }]}>
          <Text style={[gnssStyles.badgeText, { color: data ? colors.gnssActive : colors.textTertiary }]}>
            {data ? 'ACTIVE' : 'NO SIGNAL'}
          </Text>
        </View>
      </View>
      <View style={gnssStyles.grid}>
        {fields.map((f) => (
          <View key={f.label} style={gnssStyles.field}>
            <Text style={gnssStyles.fieldLabel}>{f.label}</Text>
            <Text style={gnssStyles.fieldValue}>{f.value}<Text style={gnssStyles.fieldUnit}> {f.unit}</Text></Text>
          </View>
        ))}
      </View>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  title: { ...textStyles.labelMedium, color: colors.textPrimary, flex: 1, textTransform: 'uppercase', letterSpacing: 1 },
  badge: { paddingHorizontal: spacing[2], paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: 9, fontWeight: fontWeights.bold, letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[4] },
  field: { width: '45%', gap: 2 },
  fieldLabel: { ...textStyles.caption, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue: { ...textStyles.labelLarge, color: colors.textPrimary },
  fieldUnit: { ...textStyles.caption, color: colors.textTertiary },
});

export function SensorMonitorScreen() {
  const { state } = useNavigation();
  const imu = state.imuData;
  const gnss = state.gnssData;
  const heading = imu?.heading ?? 0;

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
          subtitle="Live sensor data from device"
        />

        {/* GNSS Card */}
        <GNSSCard data={gnss} />

        {/* IMU Cards */}
        <SensorCard
          title="Accelerometer"
          unit="m/s²"
          data={imu?.accelerometer ?? null}
          color={colors.primary}
          isActive={!!imu}
        />

        <SensorCard
          title="Gyroscope"
          unit="rad/s"
          data={imu?.gyroscope ?? null}
          color={colors.secondary}
          isActive={!!imu}
        />

        <SensorCard
          title="Magnetometer"
          unit="μT"
          data={imu?.magnetometer ?? null}
          color={colors.gnssActive}
          isActive={!!imu}
        />

        <SensorCard
          title="Heading / Orientation"
          unit=""
          data={imu ? { heading, direction: headingToDirection(heading) } : null}
          color={colors.deadReckoning}
          isActive={!!imu}
        />

        {/* Sensor Health */}
        <GlassCard elevated>
          <Text style={styles.healthTitle}>Sensor Health</Text>
          <HealthRow label="GNSS" active={!!gnss} simulated={!state.isNavigating} />
          <HealthRow label="Accelerometer" active={!!imu} simulated={imu?.isSimulated} />
          <HealthRow label="Gyroscope" active={!!imu} simulated={imu?.isSimulated} />
          <HealthRow label="Magnetometer" active={!!imu} simulated={imu?.isSimulated} />
        </GlassCard>

        {imu?.isSimulated && (
          <View style={styles.simNote}>
            <Text style={styles.simNoteIcon}>ℹ️</Text>
            <Text style={styles.simNoteText}>
              Demo sensor stream active — real device sensors unavailable or permission denied.
            </Text>
          </View>
        )}

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
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
  spacer: { height: spacing[8] },
});

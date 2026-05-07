import { useMemo } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { COLORS } from "../constants";
import type { SensorReading } from "../types";
import {
  ACTUAL_KEY_MAP,
  LABEL_MAP,
  READING_KEY_MAP,
  UNIT_MAP,
} from "../features/sensors/sensorMeasurementCatalog";
import { getMeasurementRange } from "../features/sensors/getMeasurementRange";
import { useHubDataStore } from "../stores/hubDataStore";
import type { RootStackParamList } from "../navigation/types";
import { Card, IconBadge, ZonaPill } from "../components/ui";
import { getDeviceIcon } from "../components/icons/getDeviceIcon";
import { semaforo, type SemaforoState } from "../utils/semaforo";

type Props = NativeStackScreenProps<RootStackParamList, "SensorDetail">;

const STATE_HEADLINE: Record<SemaforoState, string> = {
  ok: "Todo bien",
  warn: "Atención",
  bad: "Fuera de rango",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getSensorLabelFromId(sensorId: string): string {
  if (!sensorId.startsWith("sensor-")) {
    return sensorId.toUpperCase();
  }

  const lastDash = sensorId.lastIndexOf("-");
  if (lastDash <= "sensor-".length) {
    return sensorId.slice("sensor-".length).toUpperCase();
  }

  return sensorId.slice("sensor-".length, lastDash).toUpperCase();
}

export function SensorDetailScreen({ route, navigation }: Props) {
  const { sensorId } = route.params;
  const actual = useHubDataStore((s) => s.actual);
  const config = useHubDataStore((s) => s.config);
  const sensorDevice = useHubDataStore((s) =>
    s.devices.find((device) => device.id === sensorId && device.type === "sensor")
  );

  const measurementKey = sensorDevice?.sensorType ?? null;
  const measurementLabel = measurementKey ? LABEL_MAP[measurementKey] : null;
  const measurementRange = measurementKey
    ? getMeasurementRange(measurementKey, config)
    : null;
  const zones = sensorDevice?.zones ?? [];

  const errors = useMemo(() => {
    if (!actual) return [];
    const allErrors: string[] = [];
    if (actual.errors.temperature.length > 0) {
      allErrors.push(...actual.errors.temperature);
    }
    if (actual.errors.humidity.length > 0) {
      allErrors.push(...actual.errors.humidity);
    }
    if (actual.errors.sensors.length > 0) {
      allErrors.push(...actual.errors.sensors);
    }
    return allErrors;
  }, [actual]);

  if (!actual) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Sin datos del sensor</Text>
        <Text style={styles.link} onPress={() => navigation.goBack()}>
          Volver
        </Text>
      </View>
    );
  }

  if (!sensorDevice || !measurementKey || !measurementLabel) {
    const unsupportedTitle = sensorDevice?.name ?? getSensorLabelFromId(sensorId);
    const unsupportedSubtype = sensorDevice?.subtype ?? "Sensor";

    return (
      <View style={styles.container}>
        <Card style={styles.padCard}>
          <Text style={styles.deviceName}>{unsupportedTitle}</Text>
          <Text style={styles.deviceSubtype}>{unsupportedSubtype}</Text>
        </Card>
        <Card style={[styles.padCard, styles.unsupportedCard]}>
          <Text style={styles.unsupportedTitle}>Sensor no soportado</Text>
          <Text style={styles.unsupportedBody}>
            Este dispositivo todavía no tiene una vista de detalle disponible.
          </Text>
          <Text style={styles.link} onPress={() => navigation.goBack()}>
            Volver
          </Text>
        </Card>
      </View>
    );
  }

  const Icon = getDeviceIcon(sensorDevice);
  const actualValue = Number.parseFloat(actual[ACTUAL_KEY_MAP[measurementKey]]);
  const hasValue = Number.isFinite(actualValue);
  const unit = UNIT_MAP[measurementKey] ?? "";
  const status = measurementRange
    ? semaforo(actualValue, measurementRange.min, measurementRange.max)
    : semaforo(null, 0, 1);
  const ratio =
    measurementRange && measurementRange.max > measurementRange.min
      ? (actualValue - measurementRange.min) /
        (measurementRange.max - measurementRange.min)
      : 0;
  const progress = Math.min(100, Math.max(0, ratio * 100));

  return (
    <View style={styles.container}>
      <FlatList<SensorReading>
        data={[]}
        keyExtractor={(_, index) => String(index)}
        ListEmptyComponent={
          <Text style={styles.emptyHistory}>
            Sin histórico disponible.
          </Text>
        }
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <View
              style={[styles.heroCard, { backgroundColor: status.bg }]}
              accessibilityLabel={`${measurementLabel} ${hasValue ? actualValue.toFixed(1) : "sin dato"} ${unit}`}
            >
              <IconBadge bg="rgba(255,255,255,0.6)" size={120}>
                <Icon size={84} color={status.fg} />
              </IconBadge>
              <Text style={[styles.heroState, { color: status.fg }]}>
                {STATE_HEADLINE[status.state]}
              </Text>
              <View style={styles.heroValueRow}>
                <Text
                  style={[styles.heroValue, { color: status.fg }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {hasValue ? actualValue.toFixed(1) : "—"}
                </Text>
                <Text style={[styles.heroUnit, { color: status.fg }]}>
                  {unit}
                </Text>
              </View>
              <Text style={styles.heroLabel}>{measurementLabel}</Text>
            </View>

            {measurementRange && hasValue && (
              <Card style={styles.rangeCard}>
                <Text style={styles.rangeTitle}>Rango configurado</Text>
                <View style={styles.rangeBar}>
                  <View testID="sensor-range-marker-rail" style={styles.rangeRail}>
                    <View
                      testID="sensor-range-marker"
                      style={[
                        styles.rangeMarker,
                        {
                          left: `${progress}%`,
                          backgroundColor: status.fg,
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.rangeBounds}>
                  <Text style={styles.rangeBound}>
                    {measurementRange.min.toFixed(1)}
                    {unit}
                  </Text>
                  <Text style={styles.rangeBound}>
                    {measurementRange.max.toFixed(1)}
                    {unit}
                  </Text>
                </View>
              </Card>
            )}

            <Card style={styles.padCard}>
              <Text style={styles.deviceName}>{sensorDevice.name}</Text>
              <Text style={styles.deviceSubtype}>{sensorDevice.subtype}</Text>
              {zones.length > 0 && (
                <View style={styles.zonesRow}>
                  {zones.map((zone) => (
                    <ZonaPill key={zone} name={zone} />
                  ))}
                </View>
              )}
            </Card>

            {errors.length > 0 && (
              <Card style={[styles.padCard, styles.errorCard]}>
                <Text style={styles.errorTitle}>Errores activos</Text>
                {errors.map((error, index) => (
                  <Text key={`${error}-${index}`} style={styles.errorBody}>
                    {error}
                  </Text>
                ))}
              </Card>
            )}

            <Text style={styles.sectionTitle}>Histórico reciente</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const readingKey = READING_KEY_MAP[measurementKey];
          const value = item[readingKey];
          const itemStatus =
            measurementRange && typeof value === "number"
              ? semaforo(value, measurementRange.min, measurementRange.max)
              : null;
          const isOutOfRange = itemStatus?.state === "bad";
          return (
            <View
              testID={
                isOutOfRange
                  ? `history-row-out-of-range-${index}`
                  : `history-row-${index}`
              }
              style={[
                styles.historyRow,
                itemStatus && { backgroundColor: itemStatus.bg },
              ]}
            >
              <Text style={styles.historyTime}>{formatTime(item.timestamp)}</Text>
              <Text
                style={[
                  styles.historyValue,
                  itemStatus && { color: itemStatus.fg },
                ]}
              >
                {typeof value === "number"
                  ? `${value.toFixed(1)}${unit}`
                  : "—"}
              </Text>
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
  },
  link: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 32,
  },
  headerWrap: {
    padding: 16,
    gap: 16,
  },
  heroCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 14,
  },
  heroState: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  heroValue: {
    fontSize: 84,
    fontWeight: "800",
    lineHeight: 88,
    letterSpacing: -2,
  },
  heroUnit: {
    fontSize: 32,
    fontWeight: "700",
  },
  heroLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  rangeCard: {
    gap: 12,
  },
  rangeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  rangeBar: {
    height: 14,
    borderRadius: 999,
    backgroundColor: COLORS.divider,
    position: "relative",
  },
  rangeRail: {
    ...StyleSheet.absoluteFillObject,
    left: 9,
    right: 9,
  },
  rangeMarker: {
    position: "absolute",
    top: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    transform: [{ translateX: -9 }],
    borderWidth: 3,
    borderColor: "#fff",
  },
  rangeBounds: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rangeBound: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  padCard: {
    gap: 4,
  },
  deviceName: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
  },
  deviceSubtype: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  zonesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  unsupportedCard: {
    gap: 8,
  },
  unsupportedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  unsupportedBody: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  errorCard: {
    backgroundColor: COLORS.errorSoft,
    gap: 4,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.error,
  },
  errorBody: {
    fontSize: 14,
    color: COLORS.error,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 8,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: COLORS.surface,
  },
  historyTime: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  historyValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  emptyHistory: {
    marginHorizontal: 16,
    paddingVertical: 24,
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});

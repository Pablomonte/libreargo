import { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, DIRECT_MODE_IP } from "../constants";
import type { ConnectionMode, Hub } from "../types";
import {
  getConfig,
  validateHubConfig,
  InvalidHubConfigError,
} from "../services/hubDataService";
import { BigButton, IconBadge } from "./ui";
import { IcoAlerta, IcoCheck, IcoWifi, IcoX } from "./icons";

type AddHubStep = "confirm-switch" | "ip-input" | "searching" | "error";

const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

interface AddHubModalProps {
  readonly visible: boolean;
  readonly initialMode: ConnectionMode;
  readonly onAdded: (hub: Hub) => void;
  readonly onCancel: () => void;
  readonly onSwitchToDirecto: () => void;
}

function initialStep(mode: ConnectionMode): AddHubStep {
  return mode === "online" ? "confirm-switch" : "ip-input";
}

export function AddHubModal({
  visible,
  initialMode,
  onAdded,
  onCancel,
  onSwitchToDirecto,
}: AddHubModalProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<AddHubStep>(() => initialStep(initialMode));
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [hubIp, setHubIp] = useState<string>(DIRECT_MODE_IP);

  useEffect(() => {
    if (visible) {
      setStep(initialStep(initialMode));
      setErrorMessage("");
      setHubIp(DIRECT_MODE_IP);
    }
  }, [visible, initialMode]);

  useEffect(() => {
    if (!visible || step !== "searching") {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const rawConfig = await getConfig(hubIp);
        const config = validateHubConfig(rawConfig);

        if (cancelled) {
          return;
        }

        const hub: Hub = {
          hash: config.hash,
          name: config.incubator_name,
          ip: hubIp,
          status: "conectado",
          addedAt: new Date().toISOString(),
        };

        onAdded(hub);
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof InvalidHubConfigError
            ? error.message
            : "No se pudo conectar al hub. Verificá la conexión Wi-Fi.";

        setErrorMessage(message);
        setStep("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, step, hubIp, onAdded]);

  const handleConfirmSwitch = () => {
    onSwitchToDirecto();
    setStep("ip-input");
  };

  const handleStartSearch = () => {
    if (!IPV4_REGEX.test(hubIp.trim())) {
      setErrorMessage("La IP no tiene un formato válido (ej. 192.168.16.10).");
      setStep("error");
      return;
    }
    setHubIp(hubIp.trim());
    setStep("searching");
  };

  const handleRetry = () => {
    setErrorMessage("");
    setStep("ip-input");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View
        style={[
          styles.overlay,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
      >
        <View style={styles.card}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            onPress={onCancel}
            style={styles.closeBtn}
            activeOpacity={0.85}
          >
            <IcoX size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {step === "confirm-switch" && (
            <>
              <View style={styles.heroIcon}>
                <IconBadge bg={COLORS.primarySoft} size={96}>
                  <IcoWifi size={56} color={COLORS.primary} />
                </IconBadge>
              </View>
              <Text style={styles.title}>Cambiar a Directo</Text>
              <Text style={styles.body}>
                Para agregar un hub necesitamos pasar a modo Directo.
                Asegurate de estar conectado al Wi-Fi del hub (red
                "moni-XXXX") y tocá Continuar.
              </Text>
              <View style={styles.actions}>
                <View style={styles.actionSlot}>
                  <BigButton
                    label="Cancelar"
                    onPress={onCancel}
                    variant="outline"
                    color={COLORS.textSecondary}
                  />
                </View>
                <View style={styles.actionSlot}>
                  <BigButton label="Continuar" onPress={handleConfirmSwitch} />
                </View>
              </View>
            </>
          )}

          {step === "ip-input" && (
            <>
              <View style={styles.heroIcon}>
                <IconBadge bg={COLORS.primarySoft} size={96}>
                  <IcoWifi size={56} color={COLORS.primary} />
                </IconBadge>
              </View>
              <Text style={styles.title}>IP del hub</Text>
              <Text style={styles.body}>
                Ingresá la IP del hub al que querés conectarte. Por defecto usamos
                la del modo AP del firmware.
              </Text>
              <TextInput
                accessibilityLabel="IP del hub"
                value={hubIp}
                onChangeText={setHubIp}
                placeholder="192.168.16.10"
                placeholderTextColor={COLORS.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numbers-and-punctuation"
                inputMode="numeric"
                style={styles.ipInput}
              />
              <View style={styles.actions}>
                <View style={styles.actionSlot}>
                  <BigButton
                    label="Cancelar"
                    onPress={onCancel}
                    variant="outline"
                    color={COLORS.textSecondary}
                  />
                </View>
                <View style={styles.actionSlot}>
                  <BigButton label="Buscar" onPress={handleStartSearch} />
                </View>
              </View>
            </>
          )}

          {step === "searching" && (
            <>
              <View style={styles.heroIcon}>
                <IconBadge bg={COLORS.primarySoft} size={96}>
                  <IcoWifi size={56} color={COLORS.primary} />
                </IconBadge>
              </View>
              <Text style={styles.title}>Buscando hub…</Text>
              <Text style={styles.body}>
                Consultando el hub conectado por Wi-Fi. Puede tardar unos
                segundos.
              </Text>
              <ActivityIndicator
                size="large"
                color={COLORS.primary}
                style={styles.loader}
              />
            </>
          )}

          {step === "error" && (
            <>
              <View style={styles.heroIcon}>
                <IconBadge bg={COLORS.errorSoft} size={96}>
                  <IcoAlerta size={56} color={COLORS.error} />
                </IconBadge>
              </View>
              <Text style={styles.title}>No se pudo agregar</Text>
              <Text style={styles.body}>{errorMessage}</Text>
              <View style={styles.actions}>
                <View style={styles.actionSlot}>
                  <BigButton
                    label="Cancelar"
                    onPress={onCancel}
                    variant="outline"
                    color={COLORS.textSecondary}
                  />
                </View>
                <View style={styles.actionSlot}>
                  <BigButton
                    label="Reintentar"
                    onPress={handleRetry}
                    icon={<IcoCheck size={26} color="#fff" />}
                  />
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    paddingTop: 32,
    alignItems: "center",
    gap: 16,
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  heroIcon: {
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  loader: {
    marginVertical: 8,
  },
  ipInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontVariant: ["tabular-nums"],
    color: COLORS.text,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 8,
  },
  actionSlot: {
    flex: 1,
  },
});

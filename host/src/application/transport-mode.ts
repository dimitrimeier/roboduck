export type TransportMode = "usb" | "bluetooth" | "both";
export type EnabledTransport = "usb" | "bluetooth";

export function readTransportMode(value: string | undefined): TransportMode {
  const normalized = value?.trim().toLowerCase() ?? "both";
  if (normalized !== "usb" && normalized !== "bluetooth" && normalized !== "both") {
    throw new Error("OPENCODE_STATUS_TRANSPORT must be usb, bluetooth, or both");
  }
  return normalized;
}

export function enabledTransports(mode: TransportMode): readonly EnabledTransport[] {
  if (mode === "both") {
    return ["usb", "bluetooth"];
  }
  return [mode];
}

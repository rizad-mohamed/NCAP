export interface TelemetryEvent {
  name: "page_view" | "not_found" | "api_failure" | "flow_step" | "web_vital";
  properties?: Record<string, string | number | boolean>;
}

export interface TelemetryClient {
  capture(event: TelemetryEvent): void;
  captureError(error: unknown, context?: Record<string, string>): void;
}

/** Disabled until a privacy-reviewed provider is configured. Never accepts passwords or tokens. */
export const telemetry: TelemetryClient = {
  capture: () => undefined,
  captureError: () => undefined,
};

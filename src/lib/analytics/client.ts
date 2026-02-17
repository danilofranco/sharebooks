// Cliente Amplitude (lazy load para não quebrar SSR)
export async function initAmplitude(clientKey?: string) {
  if (typeof window === "undefined") return;
  const amplitude = await import("@amplitude/analytics-browser");
  const key = clientKey || (process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY as string) || "";
  if (!key) return;
  amplitude.init(key);
}

export async function trackEvent(name: string, properties?: Record<string, any>) {
  if (typeof window === "undefined") return;
  const amplitude = await import("@amplitude/analytics-browser");
  amplitude.track(name, properties);
}

export async function identifyUser(userId: string, traits?: Record<string, any>) {
  if (typeof window === "undefined") return;
  const amplitude = await import("@amplitude/analytics-browser");
  amplitude.identify({ user_id: userId, user_properties: traits });
}


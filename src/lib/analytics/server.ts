// Servidor: proxy para Amplitude HTTP API v2 (mantém a API KEY secreta)
export async function sendServerEvent(
  eventName: string,
  properties: Record<string, any> = {},
  userId?: string,
) {
  const apiKey = process.env.AMPLITUDE_API_KEY;
  if (!apiKey) {
    throw new Error("AMPLITUDE_API_KEY não configurada no server");
  }

  const payload = {
    api_key: apiKey,
    events: [
      {
        user_id: userId ?? null,
        event_type: eventName,
        event_properties: properties,
        time: Date.now(),
      },
    ],
  };

  const res = await fetch("https://api.amplitude.com/2/httpapi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Amplitude proxy error: ${res.status} ${text}`);
  }

  return res.json();
}


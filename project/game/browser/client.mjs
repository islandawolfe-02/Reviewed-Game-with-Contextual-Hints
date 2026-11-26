// Supplied browser client. It sends game JSON with a content-type header to the same origin.
// It imports no server configuration and holds no credentials: those stay in the server-side client.
export async function askForHint(body, { fetchImpl = globalThis.fetch, baseUrl = '' } = {}) {
  const response = await fetchImpl(`${baseUrl}/api/hint`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`hint request failed with HTTP ${response.status}`);
  return response.json();
}

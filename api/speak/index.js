// Mama reads the card out loud.
// The ElevenLabs key never reaches the browser: it lives only in Azure's
// application settings (ELEVENLABS_API_KEY, MAMA_VOICE_ID).
const MAX_CHARACTERS = 1200;
const ALLOWED_HOSTS = ['mamasaidapp.com', 'www.mamasaidapp.com'];

function hostAllowed(req) {
  const source = req.headers.origin || req.headers.referer || '';
  let host;
  try { host = new URL(source).hostname; } catch { return false; }
  if (ALLOWED_HOSTS.includes(host)) return true;
  // Test websites Azure builds for this app (lemon-grass-0b0d26010-*.azurestaticapps.net).
  return /^lemon-grass-0b0d26010(-[a-z0-9]+)?\.[a-z0-9.]*azurestaticapps\.net$/.test(host);
}

const reply = (status, message) => ({ status, headers: { 'Content-Type': 'application/json' }, body: { message } });

module.exports = async function (context, req) {
  if (!hostAllowed(req)) { context.res = reply(403, 'Not allowed.'); return; }

  const key = process.env.ELEVENLABS_API_KEY;
  const voice = process.env.MAMA_VOICE_ID;
  if (!key || !voice) { context.res = reply(503, "Mama's voice is not set up yet."); return; }

  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) { context.res = reply(400, 'Write a message first.'); return; }
  if (text.length > MAX_CHARACTERS) { context.res = reply(400, `Please keep the card under ${MAX_CHARACTERS} letters for Mama to read.`); return; }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: process.env.MAMA_VOICE_MODEL || 'eleven_multilingual_v2' }),
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) {
      context.log.warn(`ElevenLabs returned ${response.status}`);
      context.res = reply(502, "Mama couldn't speak just now. Please try again.");
      return;
    }
    const audio = Buffer.from(await response.arrayBuffer());
    context.res = { status: 200, isRaw: true, headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' }, body: audio };
  } catch (error) {
    context.log.warn(`Speech request failed: ${error.name}`);
    context.res = reply(502, "Mama couldn't speak just now. Please try again.");
  }
};

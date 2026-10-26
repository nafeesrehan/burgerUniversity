export default function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const siteKey = "0x4AAAAAAFmVNwzvuJRACzu8";
  response.setHeader('Cache-Control', 'no-store');

  if (!siteKey) {
    response.status(503).json({ error: 'TURNSTILE_SITE_KEY is not configured' });
    return;
  }

  response.status(200).json({ siteKey });
}

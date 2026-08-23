export default function handler(req, res) {
  res.status(410).json({ error: 'Moved', message: 'Use /api/fpl-proxy (App Router) at /app/api/fpl-proxy/route.js' });
}

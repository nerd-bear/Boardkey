import type { RequestHandler } from './$types';
import { coerceSettings, encodeSettings } from '$lib/settings/cookieSettings';
import { dev } from '$app/environment';

const COOKIE_NAME = 'bk_settings';

const MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export const POST: RequestHandler = async ({ request, cookies }) => {
	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400 });
	}

	const settings = coerceSettings(body);
	const value = encodeSettings(settings);

	cookies.set(COOKIE_NAME, value, {
		path: '/',
		httpOnly: false, 
		sameSite: 'lax',
		secure: !dev, 
		maxAge: MAX_AGE_SECONDS
	});

	return new Response(JSON.stringify({ ok: true }), {
		headers: { 'content-type': 'application/json' }
	});
};
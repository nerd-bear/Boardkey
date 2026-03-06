export type Settings = {
	v: 1;
	music: boolean;
	musicVolume: number; // 0..100
	sfx: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
	v: 1,
	music: false,
	musicVolume: 50,
	sfx: true
};

function clamp(n: number, min: number, max: number) {
	return Math.min(max, Math.max(min, n));
}

/**
 * Defensive parse + sanitize.
 * - Ensures correct shape
 * - Applies defaults
 * - Clamps ranges
 */
export function coerceSettings(input: unknown): Settings {
	const obj = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;

	const music = typeof obj.music === 'boolean' ? obj.music : DEFAULT_SETTINGS.music;
	const sfx = typeof obj.sfx === 'boolean' ? obj.sfx : DEFAULT_SETTINGS.sfx;

	let musicVolume = DEFAULT_SETTINGS.musicVolume;
	if (typeof obj.musicVolume === 'number' && Number.isFinite(obj.musicVolume)) {
		musicVolume = clamp(Math.round(obj.musicVolume), 0, 100);
	} else if (typeof obj.musicVolume === 'string') {
		const n = Number(obj.musicVolume);
		if (Number.isFinite(n)) musicVolume = clamp(Math.round(n), 0, 100);
	}

	return {
		v: 1,
		music,
		musicVolume,
		sfx
	};
}

/**
 * Encode settings into a cookie-safe string.
 * Base64url(JSON) keeps it compact and avoids special chars.
 */
export function encodeSettings(s: Settings): string {
	const json = JSON.stringify(s);
	// base64url in both Node and modern browsers
	const b64 = Buffer.from(json, 'utf8').toString('base64url');
	return b64;
}

/**
 * Decode cookie string -> Settings (sanitized).
 * Returns DEFAULT_SETTINGS on any failure.
 */
export function decodeSettings(raw: string | undefined | null): Settings {
	if (!raw) return DEFAULT_SETTINGS;
	try {
		const json = Buffer.from(raw, 'base64url').toString('utf8');
		const parsed = JSON.parse(json) as unknown;

		// allow future migration by reading whatever and coercing
		return coerceSettings(parsed);
	} catch {
		return DEFAULT_SETTINGS;
	}
}
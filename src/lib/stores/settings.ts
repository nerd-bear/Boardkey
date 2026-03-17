import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface Settings {
	selectedFont: string;
	music: boolean;
	musicVolume: number;
	sfx: boolean;
}

const STORAGE_KEY = 'boardkey_settings';

const defaults: Settings = {
	selectedFont: 'Hubballi',
	music: false,
	musicVolume: 50,
	sfx: true,
};

function loadFromStorage(): Settings {
	if (!browser) return defaults;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaults;
		return { ...defaults, ...JSON.parse(raw) };
	} catch {
		return defaults;
	}
}

function createSettingsStore() {
	const { subscribe, set, update } = writable<Settings>(loadFromStorage());

	return {
		subscribe,
		set(value: Settings) {
			set(value);
			if (browser) {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
			}
		},
		update(fn: (s: Settings) => Settings) {
			update((current) => {
				const next = fn(current);
				if (browser) {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
				}
				return next;
			});
		},
		patch(partial: Partial<Settings>) {
			this.update((s) => ({ ...s, ...partial }));
		},
	};
}

export const settings = createSettingsStore();
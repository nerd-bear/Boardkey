import { playNamedSound } from './soundPlayer.ts';

export interface EasterEgg {
	sequence: string;
	sound: string;
	onTrigger?: () => void;
	pitchVariance?: number;
}

export const EASTER_EGGS: EasterEgg[] = [
	{
		sequence: 'boardkey',
		sound: 'secret',
		onTrigger: () => console.log('boardkey easter egg!'),
	},
	{
		sequence: 'hello',
		sound: 'hello',
		pitchVariance: 0.1,
	},
];

export function createEasterEggWatcher(eggs: EasterEgg[] = EASTER_EGGS) {
	const progress = new Array(eggs.length).fill(0);

	return function checkKey(key: string) {
		const ch = key.toLowerCase();

		for (let i = 0; i < eggs.length; i++) {
			const egg = eggs[i];
			const expected = egg.sequence[progress[i]].toLowerCase();

			if (ch === expected) {
				progress[i]++;
				if (progress[i] === egg.sequence.length) {
					playNamedSound(egg.sound, egg.pitchVariance ?? 0);
					egg.onTrigger?.();
					progress[i] = 0;
				}
			} else {
				progress[i] = ch === egg.sequence[0].toLowerCase() ? 1 : 0;
			}
		}
	};
}
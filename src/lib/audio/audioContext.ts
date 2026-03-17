const isBrowser = typeof window !== 'undefined';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

export function getAudioContext(): AudioContext | null {
	if (!isBrowser) return null;

	const AC = (window.AudioContext ?? (window as any).webkitAudioContext) as typeof AudioContext | undefined;
	if (!AC) return null;

	if (!audioCtx) {
		audioCtx = new AC();
		masterGain = audioCtx.createGain();
		masterGain.gain.value = 1.0;
		masterGain.connect(audioCtx.destination);
	}

	return audioCtx;
}

export function getMasterGain(): GainNode | null {
	getAudioContext(); 
	return masterGain;
}

export async function unlockAudio(): Promise<void> {
	const ctx = getAudioContext();
	if (!ctx) return;
	if (ctx.state !== 'running') await ctx.resume();
}
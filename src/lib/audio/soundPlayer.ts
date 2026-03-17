import { getAudioContext, getMasterGain } from './audioContext.ts';

const namedBuffers = new Map<string, { buffer: AudioBuffer; gain: GainNode }>();

let clickBuffer: AudioBuffer | null = null;
let clickGain: GainNode | null = null;
let clickVolume = 0.9;

function ensureClickGain(): GainNode | null {
	const ctx = getAudioContext();
	const master = getMasterGain();
	if (!ctx || !master) return null;

	if (!clickGain) {
		clickGain = ctx.createGain();
		clickGain.gain.value = clickVolume;
		clickGain.connect(master);
	}

	return clickGain;
}

export async function loadSound(url = '/key.wav'): Promise<void> {
	const ctx = getAudioContext();
	if (!ctx) return;

	ensureClickGain();

	const res = await fetch(url);
	const arr = await res.arrayBuffer();
	clickBuffer = await ctx.decodeAudioData(arr);
}

export async function loadNamedSound(name: string, url: string, volume = 1.0): Promise<void> {
	const ctx = getAudioContext();
	const master = getMasterGain();
	if (!ctx || !master) return;

	const res = await fetch(url);
	const arr = await res.arrayBuffer();
	const buffer = await ctx.decodeAudioData(arr);

	const gain = ctx.createGain();
	gain.gain.value = volume;
	gain.connect(master);

	namedBuffers.set(name, { buffer, gain });
}

export function setClickVolume(v: number): void {
	clickVolume = Math.max(0, Math.min(1, v));
	if (clickGain) clickGain.gain.value = clickVolume;
}

export function playSound(): void {
	const ctx = getAudioContext();
	const gain = ensureClickGain();
	if (!ctx || !gain || ctx.state !== 'running' || !clickBuffer) return;

	const src = ctx.createBufferSource();
	src.buffer = clickBuffer;
	src.playbackRate.value = 0.98 + Math.random() * 0.05;
	src.connect(gain);
	src.start();
}

export function playNamedSound(name: string, pitchVariance = 0): void {
	const ctx = getAudioContext();
	if (!ctx || ctx.state !== 'running') return;

	const entry = namedBuffers.get(name);
	if (!entry) return;

	const src = ctx.createBufferSource();
	src.buffer = entry.buffer;
	if (pitchVariance > 0) {
		src.playbackRate.value = 1 - pitchVariance / 2 + Math.random() * pitchVariance;
	}
	src.connect(entry.gain);
	src.start();
}
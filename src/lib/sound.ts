const isBrowser = typeof window !== 'undefined';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let clickGainNode: GainNode | null = null;
let clickVolume = 0.9;

const namedBuffers = new Map<string, AudioBuffer>();
const namedGains = new Map<string, GainNode>();

function getCtx(): AudioContext | null {
	if (!isBrowser) return null;
	const AC = (window.AudioContext ?? (window as any).webkitAudioContext) as typeof AudioContext | undefined;
	if (!AC) return null;
	if (!audioCtx) audioCtx = new AC();
	return audioCtx;
}

function ensureGraph(): AudioContext | null {
	const ctx = getCtx();
	if (!ctx) return null;

	if (!masterGain) {
		masterGain = ctx.createGain();
		masterGain.gain.value = 1.0;
		masterGain.connect(ctx.destination);
	}

	if (!clickGainNode) {
		clickGainNode = ctx.createGain();
		clickGainNode.gain.value = clickVolume;
		clickGainNode.connect(masterGain);
	}

	return ctx;
}

export async function loadSound(url = '/key.wav') {
	const ctx = ensureGraph();
	if (!ctx) return;
	const res = await fetch(url);
	const arr = await res.arrayBuffer();
	clickBuffer = await ctx.decodeAudioData(arr);
}

export async function loadNamedSound(name: string, url: string, volume = 1.0) {
	const ctx = ensureGraph();
	if (!ctx) return;

	const res = await fetch(url);
	const arr = await res.arrayBuffer();
	const buffer = await ctx.decodeAudioData(arr);
	namedBuffers.set(name, buffer);

	const gain = ctx.createGain();
	gain.gain.value = volume;
	gain.connect(masterGain!);
	namedGains.set(name, gain);
}

export async function unlockAudio() {
	const ctx = ensureGraph();
	if (!ctx) return;
	if (ctx.state !== 'running') await ctx.resume();
}

export function setClickVolume(v: number) {
	clickVolume = Math.max(0, Math.min(1, v));
	if (clickGainNode) clickGainNode.gain.value = clickVolume;
}

export function playSound() {
	const ctx = ensureGraph();
	if (!ctx || ctx.state !== 'running') return;
	if (!clickBuffer) return;

	const src = ctx.createBufferSource();
	src.buffer = clickBuffer;
	src.playbackRate.value = 0.98 + Math.random() * 0.05;
	src.connect(clickGainNode!);
	src.start();
}

export function playNamedSound(name: string, pitchVariance = 0) {
	const ctx = ensureGraph();
	if (!ctx || ctx.state !== 'running') return;

	const buffer = namedBuffers.get(name);
	const gain = namedGains.get(name);
	if (!buffer || !gain) return;

	const src = ctx.createBufferSource();
	src.buffer = buffer;
	if (pitchVariance > 0) {
		src.playbackRate.value = 1 - pitchVariance / 2 + Math.random() * pitchVariance;
	}
	src.connect(gain);
	src.start();
}

let clickBuffer: AudioBuffer | null = null;
import { browser } from '$app/environment';
import { getAudioContext, getMasterGain } from './audioContext.ts';

export interface AmbientSoundEntry {
    id: string;
    src: string;
    volume: number;
    minDelayMs: number;
    maxDelayMs: number;
    weight?: number;
    chance?: number;
    minPlaybackRate?: number;
    maxPlaybackRate?: number;
    minVolumeMultiplier?: number;
    maxVolumeMultiplier?: number;
    randomStartOffset?: boolean;
    randomStartMaxPercent?: number;
    enabled?: boolean;
    fadeInMs?: number;
}

export interface AmbientSoundConfig {
    sounds: AmbientSoundEntry[];
}

type LoadedSound = {
    entry: AmbientSoundEntry;
    buffer: AudioBuffer;
};

export class AmbientSoundPlayer {
    private get audioContext(): AudioContext | null {
        return getAudioContext();
    }

    private get masterGain(): GainNode | null {
        return getMasterGain();
    }

    private config: AmbientSoundConfig | null = null;
    private loadedSounds = new Map<string, LoadedSound>();
    private loadingSounds = new Map<string, Promise<LoadedSound>>();

    private currentSource: AudioBufferSourceNode | null = null;
    private currentGain: GainNode | null = null;
    private currentSoundId: string | null = null;
    private lastPlayedSoundId: string | null = null;
    private loopTimer: ReturnType<typeof setTimeout> | null = null;

    private started = false;
    private destroyed = false;
    private masterVolume = 1;

    private defaultFadeInMs = 2500;

    constructor(masterVolume = 1, defaultFadeInMs = 2500) {
        this.masterVolume = this.clamp(masterVolume, 0, 1);
        this.defaultFadeInMs = Math.max(0, defaultFadeInMs);
    }

    async loadConfig(config: AmbientSoundConfig): Promise<void> {
        this.assertBrowser();
        this.ensureNotDestroyed();
        this.config = this.normalizeConfig(config);
    }

    async loadConfigFromUrl(url: string): Promise<void> {
        this.assertBrowser();
        this.ensureNotDestroyed();

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load sound config: ${url} (${response.status})`);
        }

        const config = (await response.json()) as AmbientSoundConfig;
        await this.loadConfig(config);
    }

    async start(): Promise<void> {
        this.assertBrowser();
        this.ensureNotDestroyed();

        if (!this.config) {
            throw new Error('No config loaded. Call loadConfig() or loadConfigFromUrl() first.');
        }

        await this.resume();

        if (this.started) return;
        this.started = true;

        this.scheduleNextGlobalTick();
    }

    stop(): void {
        this.ensureNotDestroyed();
        this.started = false;

        if (this.loopTimer) {
            clearTimeout(this.loopTimer);
            this.loopTimer = null;
        }

        this.stopCurrentSound();
    }

    async pause(): Promise<void> {
        if (!this.audioContext) return;
        if (this.audioContext.state === 'running') {
            await this.audioContext.suspend();
        }
    }

    async resume(): Promise<void> {
        if (!this.audioContext) return;
        if (this.audioContext.state !== 'running') {
            await this.audioContext.resume();
        }
    }

    setMasterVolume(volume: number): void {
        this.masterVolume = this.clamp(volume, 0, 1);
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
    }

    setEnabled(id: string, enabled: boolean): void {
        if (!this.config) return;
        const sound = this.config.sounds.find((s) => s.id === id);
        if (!sound) return;

        sound.enabled = enabled;

        if (!enabled && this.currentSoundId === id) {
            this.stopCurrentSound();
        }
    }

    setDefaultFadeInMs(fadeInMs: number): void {
        this.defaultFadeInMs = Math.max(0, fadeInMs);
    }

    async destroy(): Promise<void> {
        if (this.destroyed) return;
        this.stop();
        this.destroyed = true;
        this.loadedSounds.clear();
        this.loadingSounds.clear();
    }

    private async getOrLoadSound(entry: AmbientSoundEntry): Promise<LoadedSound> {
        const existing = this.loadedSounds.get(entry.id);
        if (existing) return existing;

        const loading = this.loadingSounds.get(entry.id);
        if (loading) return loading;

        const promise = (async () => {
            const buffer = await this.fetchAndDecode(entry.src);
            const loaded = { entry, buffer };
            this.loadedSounds.set(entry.id, loaded);
            this.loadingSounds.delete(entry.id);
            return loaded;
        })();

        this.loadingSounds.set(entry.id, promise);
        return promise;
    }

    private async fetchAndDecode(src: string): Promise<AudioBuffer> {
        if (!this.audioContext) {
            throw new Error('Audio context not initialized.');
        }

        const response = await fetch(src);
        if (!response.ok) {
            throw new Error(`Failed to load audio file: ${src} (${response.status})`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return await this.audioContext.decodeAudioData(arrayBuffer);
    }

    private scheduleNextGlobalTick(lastPlayed?: AmbientSoundEntry): void {
        if (!this.started || this.destroyed || !this.config) return;

        const delay = lastPlayed
            ? this.randomInt(lastPlayed.minDelayMs, lastPlayed.maxDelayMs)
            : this.randomInt(2000, 6000);

        if (this.loopTimer) clearTimeout(this.loopTimer);

        this.loopTimer = setTimeout(() => {
            this.loopTimer = null;
            this.playNextRandomSound();
        }, delay);
    }

    private playNextRandomSound(): void {
        if (!this.started || !this.config || !this.audioContext || !this.masterGain) return;
        if (this.currentSource) return;

        const enabledSounds = this.config.sounds.filter((s) => s.enabled !== false);
        if (enabledSounds.length === 0) return;

        const candidates =
            enabledSounds.length > 1 && this.lastPlayedSoundId
                ? enabledSounds.filter((s) => s.id !== this.lastPlayedSoundId)
                : enabledSounds;

        const picked = this.pickWeightedRandom(candidates);
        if (!picked) return;

        const chance = picked.chance ?? 1;
        if (Math.random() > chance) {
            this.scheduleNextGlobalTick(picked);
            return;
        }

        void this.playPickedSound(picked);
    }

    private async playPickedSound(picked: AmbientSoundEntry): Promise<void> {
        if (!this.started || !this.audioContext || !this.masterGain) return;
        if (this.currentSource) return;

        let loaded: LoadedSound;

        try {
            loaded = await this.getOrLoadSound(picked);
        } catch (error) {
            console.error(`Failed to load sound "${picked.id}"`, error);
            this.scheduleNextGlobalTick(picked);
            return;
        }

        if (!this.started || !this.audioContext || !this.masterGain) return;
        if (this.currentSource) return;

        const source = this.audioContext.createBufferSource();
        source.buffer = loaded.buffer;

        const gain = this.audioContext.createGain();

        const playbackRate = this.randomFloat(
            picked.minPlaybackRate ?? 1,
            picked.maxPlaybackRate ?? 1
        );

        const volumeMultiplier = this.randomFloat(
            picked.minVolumeMultiplier ?? 1,
            picked.maxVolumeMultiplier ?? 1
        );

        const targetVolume = this.clamp(picked.volume * volumeMultiplier, 0, 1);
        const now = this.audioContext.currentTime;
        const fadeInSeconds = Math.max(0, (picked.fadeInMs ?? this.defaultFadeInMs) / 1000);

        source.playbackRate.value = playbackRate;

        source.connect(gain);
        gain.connect(this.masterGain);

        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(0, now);

        if (fadeInSeconds > 0) {
            gain.gain.linearRampToValueAtTime(targetVolume, now + fadeInSeconds);
        } else {
            gain.gain.setValueAtTime(targetVolume, now);
        }

        this.currentSource = source;
        this.currentGain = gain;
        this.currentSoundId = picked.id;

        source.onended = () => {
            this.currentSource = null;
            this.currentGain = null;
            this.currentSoundId = null;
            this.lastPlayedSoundId = picked.id;
            this.scheduleNextGlobalTick(picked);
        };

        try {
            source.start(0, 0);
        } catch (error) {
            console.error(`Failed to start sound "${picked.id}"`, error);
            this.currentSource = null;
            this.currentGain = null;
            this.currentSoundId = null;
            this.scheduleNextGlobalTick(picked);
        }
    }

    private stopCurrentSound(): void {
        if (this.currentSource) {
            try {
                this.currentSource.stop();
            } catch {
                // ignore :3
            }
        }

        this.currentSource = null;
        this.currentGain = null;
        this.currentSoundId = null;
    }

    private pickWeightedRandom(entries: AmbientSoundEntry[]): AmbientSoundEntry | null {
        const weighted = entries.map((e) => ({
            entry: e,
            weight: Math.max(0, e.weight ?? 1)
        }));

        const total = weighted.reduce((sum, item) => sum + item.weight, 0);
        if (total <= 0) return entries[0] ?? null;

        let roll = Math.random() * total;

        for (const item of weighted) {
            roll -= item.weight;
            if (roll <= 0) return item.entry;
        }

        return weighted[weighted.length - 1]?.entry ?? null;
    }

    private normalizeConfig(config: AmbientSoundConfig): AmbientSoundConfig {
        return {
            sounds: config.sounds.map((sound) => ({
                ...sound,
                weight: sound.weight ?? 1,
                chance: sound.chance ?? 1,
                minPlaybackRate: sound.minPlaybackRate ?? 1,
                maxPlaybackRate: sound.maxPlaybackRate ?? 1,
                minVolumeMultiplier: sound.minVolumeMultiplier ?? 1,
                maxVolumeMultiplier: sound.maxVolumeMultiplier ?? 1,
                randomStartOffset: sound.randomStartOffset ?? false,
                randomStartMaxPercent: sound.randomStartMaxPercent ?? 1,
                enabled: sound.enabled ?? true,
                fadeInMs: sound.fadeInMs
            }))
        };
    }

    private clamp(value: number, min: number, max: number): number {
        return Math.min(max, Math.max(min, value));
    }

    private randomFloat(min: number, max: number): number {
        if (max < min) [min, max] = [max, min];
        return Math.random() * (max - min) + min;
    }

    private randomInt(min: number, max: number): number {
        min = Math.floor(min);
        max = Math.floor(max);
        if (max < min) [min, max] = [max, min];
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private assertBrowser(): void {
        if (!browser) {
            throw new Error('AmbientSoundPlayer can only be used in the browser.');
        }
    }

    private ensureNotDestroyed(): void {
        if (this.destroyed) {
            throw new Error('AmbientSoundPlayer has been destroyed.');
        }
    }
}
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.nodes = {};
        this.masterLimiter = null;
        this.dcBlocker = null;
        this.initAudioContext();
        this.watchInterruptions();
        this.fadeOnLeave();
    }

    // iPad / iPhone: switching to another app puts the sound in an 'interrupted' state
    // (not 'suspended'), so it must be woken up again when the page comes back.
    isAsleep() {
        return !!this.ctx && this.ctx.state !== 'running' && this.ctx.state !== 'closed';
    }

    wake() {
        if (this.isAsleep()) this.ctx.resume().catch(() => {});
    }

    watchInterruptions() {
        const onReturn = () => {
            if (document.visibilityState !== 'visible') return;
            this.wake();
            setTimeout(() => this.checkOutputRate(), 500);
            // Safari only lets sound restart from a tap: if it is still off, say so.
            setTimeout(() => {
                if (this.hasPlayed && this.isAsleep() && document.visibilityState === 'visible' &&
                    window.synthApp && typeof window.synthApp.showNotification === 'function') {
                    window.synthApp.showNotification('Tap anywhere to turn the sound back on.');
                }
            }, 700);
        };
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') { this.outputStale = true; this.sleepInBackground(); }
            else this.cancelBackgroundSleep();
        });
        document.addEventListener('visibilitychange', onReturn);
        window.addEventListener('pageshow', onReturn);
        // Headphones plugged in or out, Bluetooth connected, etc.
        if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
            navigator.mediaDevices.addEventListener('devicechange', () => {
                this.outputStale = true;
                setTimeout(() => this.checkOutputRate(), 500);
            });
        }
        // Every tap, click or key press wakes the sound if it is asleep (cheap when it is running).
        ['pointerdown', 'touchend', 'keydown'].forEach(type => {
            window.addEventListener(type, () => { this.restartOutputIfStale(); this.wake(); }, { capture: true, passive: true });
        });
    }

    // iPad: after switching apps or changing headphones the sound output can come back late
    // (up to a second) until the page is reloaded. On the first tap after such a change the
    // output is stopped and started again, which rebuilds it. Stopping it while it sounds would
    // click, so the master fades out first (15 ms), the restart follows 30 ms later and the sound
    // fades back in. If Safari refuses the resume outside the tap, the next tap's wake() starts it
    // and the fade-in follows from 'statechange' (needsFadeIn).
    restartOutputIfStale() {
        if (!this.outputStale || !this.ctx || document.visibilityState !== 'visible') return;
        // Still asleep (paused in the background, or 'interrupted'): wake() starts it, and the restart
        // runs from 'statechange' once it is running. A plain resume after the background pause (with the
        // session type switched 'auto' -> 'playback' meanwhile) could leave the iPad output late.
        if (this.ctx.state !== 'running') return;
        this.outputStale = false;
        if (!this.masterFade) {
            this.ctx.suspend().catch(() => {});
            this.ctx.resume().catch(() => {});
            return;
        }
        this.fadeOut(0.015);
        this.needsFadeIn = true;
        setTimeout(() => {
            this.ctx.suspend().catch(() => {})
                .then(() => this.ctx.resume()).catch(() => {})
                .then(() => this.fadeInIfNeeded());
        }, 30);
    }

    // iPad / iPhone: because the engine plays as a music app ('playback', see getContext), the
    // system keeps it sounding after the app is swiped away or closed (with throttled timers, so
    // sequencers drift slower) and shows a lock-screen player. On touch devices the sound is
    // therefore faded out (15 ms) and the engine paused as soon as the page is hidden; the session
    // type goes back to 'auto' so the lock-screen player disappears. On return, wake() (page visible
    // or the next tap) restarts it and statechange fades it back in. Desktop keeps playing in a
    // background tab as before.
    isTouchDevice() {
        try { return window.matchMedia('(hover: none) and (pointer: coarse)').matches; } catch (e) { return false; }
    }

    sleepInBackground() {
        if (!this.ctx || this.ctx.state !== 'running' || !this.isTouchDevice()) return;
        this.fadeOut(0.015);
        this.needsFadeIn = true;
        clearTimeout(this.sleepTimer);
        this.sleepTimer = setTimeout(() => {
            this.sleepTimer = null;
            if (document.visibilityState !== 'hidden') return;
            this.ctx.suspend().catch(() => {});
            try { if (navigator.audioSession) { navigator.audioSession.type = 'auto'; this.sessionReleased = true; } } catch (e) {}
        }, 40);
    }

    cancelBackgroundSleep() {
        if (this.sessionReleased) {
            this.sessionReleased = false;
            try { navigator.audioSession.type = 'playback'; } catch (e) {}
        }
        if (this.sleepTimer) {
            // Back before the pause happened: just fade the sound up again
            clearTimeout(this.sleepTimer);
            this.sleepTimer = null;
            this.fadeInIfNeeded();
        }
    }

    fadeInIfNeeded() {
        if (!this.needsFadeIn || !this.ctx || this.ctx.state !== 'running' || !this.masterFade) return;
        this.needsFadeIn = false;
        const g = this.masterFade.gain, t = this.ctx.currentTime;
        g.cancelScheduledValues(t);
        g.setValueAtTime(0, t);
        g.linearRampToValueAtTime(1, t + 0.08);
    }

    // If the speaker / headphones now run at another sample rate than the sound engine,
    // the delay cannot be fixed in place: offer a restart (a reload that keeps the patch).
    checkOutputRate() {
        if (!this.ctx || this.restartOffered || document.visibilityState !== 'visible') return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        let probe = null;
        try { probe = new AudioCtx(); } catch (e) { return; }
        const hardwareRate = probe.sampleRate;
        try { probe.close().catch(() => {}); } catch (e) {}
        if (hardwareRate && hardwareRate !== this.ctx.sampleRate && typeof window.showSoundRestartNotice === 'function') {
            this.restartOffered = true;
            window.showSoundRestartNotice();
        }
    }

    initAudioContext() {
        const unlockAudio = () => {
            if (this.ctx) {
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume().then(() => {
                        if (this.ctx.state === 'running') {
                            removeListeners();
                        }
                    }).catch(() => {});
                } else if (this.ctx.state === 'running') {
                    removeListeners();
                }
            } else {
                this.getContext();
            }
        };

        const removeListeners = () => {
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
            document.removeEventListener('mousedown', unlockAudio);
        };

        document.addEventListener('click', unlockAudio);
        document.addEventListener('keydown', unlockAudio);
        document.addEventListener('touchstart', unlockAudio);
        document.addEventListener('mousedown', unlockAudio);
    }

    // מקור יחיד לסביבת השמע עבור כל המודולים באפליקציה
    getContext() {
        if (!this.ctx) {
            // iPad / iPhone (Safari 17+): play as a music app, so the system treats the sound as
            // media playback (steadier when headphones or other apps change the sound output)
            try {
                if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback';
            } catch (e) {}
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx({ latencyHint: 'interactive' });
            // Remember that sound has started once, so the "tap to turn the sound back on" note
            // only appears after an interruption, never on the first visit.
            this.hasPlayed = this.ctx.state === 'running';
            this.ctx.addEventListener('statechange', () => {
                if (this.ctx.state === 'running') {
                    this.hasPlayed = true;
                    if (this.outputStale && document.visibilityState === 'visible') this.restartOutputIfStale();
                    else this.fadeInIfNeeded();
                }
                if (this.ctx.state === 'interrupted') this.outputStale = true;
            });
            this.setupMasterProtection();
        }
        
        this.wake();

        return this.ctx;
    }

    setupMasterProtection() {
        if (!this.ctx) return;

        // 1. High-Pass Filter / DC Blocker (סינון רכיבי DC ותדרים מתחת ל-20Hz)
        this.dcBlocker = this.ctx.createBiquadFilter();
        this.dcBlocker.type = 'highpass';
        this.dcBlocker.frequency.setValueAtTime(20, this.ctx.currentTime);
        this.dcBlocker.Q.setValueAtTime(0.707, this.ctx.currentTime);

        // 2. Brickwall Limiter (הגנה מפני עומס יתר וקפיצות ווליום)
        this.masterLimiter = this.ctx.createDynamicsCompressor();
        this.masterLimiter.threshold.setValueAtTime(-1.0, this.ctx.currentTime);
        this.masterLimiter.knee.setValueAtTime(0.0, this.ctx.currentTime);
        this.masterLimiter.ratio.setValueAtTime(20.0, this.ctx.currentTime);
        this.masterLimiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.masterLimiter.release.setValueAtTime(0.1, this.ctx.currentTime);

        // חיבור השרשרת ל-destination הסופי
        this.dcBlocker.connect(this.masterLimiter);

        // 3. Master fade: a short fade out before the canvas is cleared or replaced, so cutting
        // the sounding modules does not click (see fadeAround).
        this.masterFade = this.ctx.createGain();
        this.masterLimiter.connect(this.masterFade);
        this.masterFade.connect(this.ctx.destination);
    }

    // Ramps the master to silence over `seconds`; returns the audio time when it is silent.
    fadeOut(seconds) {
        const ctx = this.ctx, g = this.masterFade && this.masterFade.gain;
        if (!g) return 0;
        const now = ctx.currentTime;
        g.cancelScheduledValues(now);
        g.setValueAtTime(g.value, now);
        g.linearRampToValueAtTime(0, now + seconds);
        return now + seconds;
    }

    // Runs fn (which tears down / rebuilds modules) behind a master fade: fade out over 80 ms, wait
    // until the audio thread has really rendered the silence (iPad renders ahead in bigger chunks and
    // timers can be late, so a fixed timer is not enough), run fn, then fade back in over 80 ms.
    // Runs fn at once when no sound plays.
    fadeAround(fn) {
        const ctx = this.ctx, g = this.masterFade && this.masterFade.gain;
        if (!g || ctx.state !== 'running') { fn(); return; }
        const silentAt = this.fadeOut(0.08) + 0.03;
        const started = performance.now();
        const go = () => {
            if (ctx.state === 'running' && ctx.currentTime < silentAt && performance.now() - started < 600) {
                setTimeout(go, 15);
                return;
            }
            try { fn(); } finally {
                const t = ctx.currentTime + 0.02;
                g.cancelScheduledValues(ctx.currentTime);
                g.setValueAtTime(0, ctx.currentTime);
                g.setValueAtTime(0, t);
                g.linearRampToValueAtTime(1, t + 0.08);
            }
        };
        setTimeout(go, 90);
    }

    // Closing the window or reloading cuts the sound at once (a click): start a quick fade as soon as
    // the page is about to go. The browser usually keeps rendering long enough for it to finish.
    fadeOnLeave() {
        const leave = () => { if (this.ctx && this.ctx.state === 'running') this.fadeOut(0.015); };
        window.addEventListener('beforeunload', leave);
        window.addEventListener('pagehide', leave);
        // Back from the back/forward cache: sound up again
        window.addEventListener('pageshow', (e) => {
            if (!e.persisted || !this.masterFade) return;
            const t = this.ctx.currentTime;
            this.masterFade.gain.cancelScheduledValues(t);
            this.masterFade.gain.setValueAtTime(0, t);
            this.masterFade.gain.linearRampToValueAtTime(1, t + 0.08);
        });
    }

    getMasterInput() {
        this.getContext();
        return this.dcBlocker;
    }

    async resume() {
        const ctx = this.getContext();
        if (this.isAsleep()) {
            await ctx.resume();
        }
        return ctx;
    }
}

window.audioEngine = new AudioEngine();
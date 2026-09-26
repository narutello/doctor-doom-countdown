/* =====================================================
   CONFIG
===================================================== */

const DEFAULT_DATE = '2026-12-18T00:00:00';
const ONE_DAY      = 24 * 60 * 60 * 1000;
const ONE_WEEK     = 7 * ONE_DAY;
const ONE_MONTH    = 30 * ONE_DAY;
const BOOT_DELAY   = 4300;
const MSG_INTERVAL = 5000;
const TYPE_SPEED   = 35;

/* Message pools by urgency */
const MSG_LOW = [
    'LATVERIA NETWORK SECURED',
    'POWER CORE STABLE',
    'DEFENSE GRID ONLINE',
    'DOOM PROTOCOL ARMED'
];

const MSG_ELEVATED = [
    'DOOM IS APPROACHING',
    'AVENGERS THREAT DETECTED',
    'ENERGY LEVELS RISING',
    'PROTOCOL STATUS: ELEVATED'
];

const MSG_HIGH = [
    'FINAL COUNTDOWN INITIATED',
    'DOOM PROTOCOL CRITICAL PATH',
    'ALL SYSTEMS AT COMBAT READY',
    'LATVERIA DEFENSE MAXIMUM'
];

const MSG_CRITICAL = [
    'IMMINENT ARRIVAL',
    'CRITICAL PROTOCOL ACTIVE',
    'DOOM IS NEAR',
    'PREPARE FOR JUDGMENT'
];

/* =====================================================
   DOM CACHE
===================================================== */

const $ = (id) => document.getElementById(id);

const els = {
    bootScreen:        $('bootScreen'),
    days:              $('days'),
    hours:             $('hours'),
    minutes:           $('minutes'),
    seconds:           $('seconds'),
    doomTitle:         $('doomTitle'),
    titleRest:         $('titleRest'),
    protocolStatus:    $('protocolStatus'),
    networkStatus:     $('networkStatus'),
    systemMessage:     $('systemMessage'),
    threatLevel:       $('threatLevel'),
    threatFill:        $('threatFill'),
    panelThreat:       $('panelThreat'),
    panelThreatBar:    $('panelThreatBar'),
    mobileThreatLevel: $('mobileThreatLevel'),
    mobileThreatFill:  $('mobileThreatFill'),
    dateSubtitle:      $('dateSubtitle'),
    muteBtn:           $('muteBtn'),
    fsBtn:             $('fsBtn')
};

/* =====================================================
   TARGET DATE (URL param support)
===================================================== */

function resolveTargetDate() {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('date');

    if (dateParam) {
        const parsed = new Date(dateParam);
        if (!isNaN(parsed.getTime())) {
            return parsed.getTime();
        }
    }
    return new Date(DEFAULT_DATE).getTime();
}

const TARGET_DATE = resolveTargetDate();

(function updateSubtitle() {
    const d = new Date(TARGET_DATE);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    els.dateSubtitle.textContent = d.toLocaleDateString('en-US', options);
})();

/* =====================================================
   SOUND (Web Audio – simple beeps)
===================================================== */

let audioCtx = null;
let soundEnabled = false;

function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function playBeep(freq = 440, duration = 0.05, type = 'square', gain = 0.04) {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioCtx();
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        g.gain.value = gain;
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start();
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.stop(ctx.currentTime + duration);
    } catch (_) {}
}

function playBootSound() {
    playBeep(220, 0.08, 'sawtooth', 0.03);
    setTimeout(() => playBeep(330, 0.06, 'square', 0.025), 120);
    setTimeout(() => playBeep(440, 0.1, 'square', 0.03), 250);
}

function playTick() {
    playBeep(920, 0.035, 'square', 0.035);
}

/* =====================================================
   SYSTEM MESSAGES (TYPEWRITER + smart pool)
===================================================== */

let messageIndex = 0;
let currentPool = MSG_LOW;

function typeMessage(text) {
    const el = els.systemMessage;
    el.textContent = '';
    let i = 0;

    const interval = setInterval(() => {
        el.textContent += text[i];
        i += 1;
        if (i >= text.length) clearInterval(interval);
    }, TYPE_SPEED);
}

function rotateMessages() {
    if (document.hidden) return;
    typeMessage(currentPool[messageIndex % currentPool.length]);
    messageIndex += 1;
}

function updateMessagePool(distance) {
    if (distance <= ONE_DAY) {
        currentPool = MSG_CRITICAL;
    } else if (distance <= ONE_WEEK) {
        currentPool = MSG_HIGH;
    } else if (distance <= ONE_MONTH) {
        currentPool = MSG_ELEVATED;
    } else {
        currentPool = MSG_LOW;
    }
}

/* =====================================================
   NUMBER ANIMATION
===================================================== */

const prevValues = { days: null, hours: null, minutes: null, seconds: null };

function animateNumber(el, key, newVal) {
    const str = String(newVal).padStart(2, '0');
    if (prevValues[key] !== null && prevValues[key] !== str) {
        el.classList.add('tick');
        setTimeout(() => {
            el.textContent = str;
            el.classList.remove('tick');
        }, 90);
    } else {
        el.textContent = str;
    }
    prevValues[key] = str;
}

/* =====================================================
   COUNTDOWN
===================================================== */

function setArrivedState() {
    document.body.classList.add('arrived');
    document.body.classList.remove('critical', 'threat-elevated', 'threat-high', 'threat-critical');

    animateNumber(els.days, 'days', 0);
    animateNumber(els.hours, 'hours', 0);
    animateNumber(els.minutes, 'minutes', 0);
    animateNumber(els.seconds, 'seconds', 0);

    els.doomTitle.textContent      = 'DOOM';
    els.titleRest.textContent      = ' HAS ARRIVED';
    els.protocolStatus.textContent = 'COMPLETE';
    els.networkStatus.textContent  = 'LATVERIA PROTOCOL COMPLETE';
}

function updateCountdown() {
    const distance = TARGET_DATE - Date.now();

    if (distance <= 0) {
        setArrivedState();
        return;
    }

    const days    = Math.floor(distance / ONE_DAY);
    const hours   = Math.floor((distance % ONE_DAY) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    animateNumber(els.days, 'days', days);
    animateNumber(els.hours, 'hours', hours);
    animateNumber(els.minutes, 'minutes', minutes);
    animateNumber(els.seconds, 'seconds', seconds);

    if (prevValues.seconds !== null && prevValues.seconds !== String(seconds).padStart(2, '0')) {
        playTick();
    }

    if (distance <= ONE_DAY) {
        document.body.classList.add('critical');
        els.protocolStatus.textContent = 'CRITICAL';
    } else {
        document.body.classList.remove('critical');
        els.protocolStatus.textContent = 'APPROACHING';
    }

    updateMessagePool(distance);
}

/* =====================================================
   THREAT SYSTEM + GLOW
===================================================== */

function getThreatState(distance) {
    if (distance <= ONE_DAY) {
        return { level: 'CRITICAL', value: 100, cls: 'threat-critical' };
    }
    if (distance <= ONE_WEEK) {
        return { level: 'HIGH', value: 75, cls: 'threat-high' };
    }
    if (distance <= ONE_MONTH) {
        return { level: 'ELEVATED', value: 50, cls: 'threat-elevated' };
    }
    return { level: 'LOW', value: 20, cls: '' };
}

function updateThreat() {
    const distance = TARGET_DATE - Date.now();
    const { level, value, cls } = getThreatState(distance);

    document.body.classList.remove('threat-elevated', 'threat-high', 'threat-critical');
    if (cls) document.body.classList.add(cls);

    els.threatLevel.textContent       = level;
    els.threatFill.style.width        = `${value}%`;
    els.panelThreat.textContent       = level;
    els.panelThreatBar.style.width    = `${value}%`;
    els.mobileThreatLevel.textContent = level;
    els.mobileThreatFill.style.width  = `${value}%`;
}

/* =====================================================
   MAIN LOOP
===================================================== */

function updateUI() {
    updateCountdown();
    updateThreat();
}

/* =====================================================
   CONTROLS
===================================================== */

function initControls() {
    els.muteBtn.addEventListener('click', async () => {
        soundEnabled = !soundEnabled;
        els.muteBtn.classList.toggle('active', soundEnabled);
        els.muteBtn.textContent = soundEnabled ? '🔊' : '🔇';

        if (soundEnabled) {
            try {
                const ctx = getAudioCtx();
                if (ctx.state === 'suspended') await ctx.resume();
            } catch (_) {}
            playBeep(520, 0.08, 'square', 0.05);
            playBeep(780, 0.06, 'square', 0.04);
        }
    });

    els.fsBtn.addEventListener('click', async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
                els.fsBtn.classList.add('active');
            } else {
                await document.exitFullscreen();
                els.fsBtn.classList.remove('active');
            }
        } catch (err) {
            console.warn('Fullscreen not available:', err);
        }
    });

    document.addEventListener('fullscreenchange', () => {
        els.fsBtn.classList.toggle('active', !!document.fullscreenElement);
    });
}

/* =====================================================
   INIT
===================================================== */

function init() {
    initControls();

    rotateMessages();
    setInterval(rotateMessages, MSG_INTERVAL);

    updateUI();
    setInterval(updateUI, 1000);

    window.addEventListener('load', () => {
        setTimeout(() => {
            els.bootScreen.classList.add('hidden');
            if (soundEnabled) playBootSound();
        }, BOOT_DELAY);
    });
}

init();

// ---------------------------------------------------------------------------
// Text split
// Wraps every word of [data-split="words"] in a masked span so the words can
// slide up individually. Each word gets --i for the stagger delay.
// ---------------------------------------------------------------------------
function splitWords() {
    document.querySelectorAll('[data-split="words"]').forEach((el) => {
        const words = el.textContent.trim().split(/\s+/);
        el.textContent = '';
        words.forEach((word, i) => {
            const mask = document.createElement('span');
            mask.className = 'word';
            const inner = document.createElement('span');
            inner.className = 'word-inner';
            inner.style.setProperty('--i', i);
            inner.textContent = word;
            mask.appendChild(inner);
            el.appendChild(mask);
            if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
        });
    });
}

// ---------------------------------------------------------------------------
// Scroll reveal
// Elements with .reveal animate in when they enter the viewport. Observation
// starts only after the preloader has finished so nothing plays behind it.
// ---------------------------------------------------------------------------
function initReveal() {
    const revealElements = document.querySelectorAll('.reveal');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                // Stop observing once animation is triggered
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        // Trigger animation when element is 10% in viewport
        threshold: 0.1,
        // Start animation a bit before element enters viewport
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach((element) => revealObserver.observe(element));
}

// ---------------------------------------------------------------------------
// Smooth scrolling (Lenis, loaded from CDN in index.html)
// ---------------------------------------------------------------------------
function initSmoothScroll() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof Lenis === 'undefined' || reduceMotion) return null;

    const lenis = new Lenis({
        // Frame-based interpolation feels steadier than the duration/easing mode,
        // which restarts its curve on every wheel tick. Lower = floatier.
        lerp: 0.09,
        smoothWheel: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.2,
        syncTouch: false,
    });
    window.lenis = lenis;

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Route same-page anchor links through Lenis so they glide instead of jump
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener('click', (event) => {
            const hash = link.getAttribute('href');
            if (!hash || hash === '#') return;
            const target = document.querySelector(hash);
            if (!target) return;
            event.preventDefault();
            lenis.scrollTo(target, { offset: 0 });
        });
    });

    return lenis;
}

// ---------------------------------------------------------------------------
// Scroll blur on project covers
// Each cover starts blurred and sharpens as it travels up into the viewport.
// Progress 0 = image top at the bottom edge, 1 = image top 55% of the way up.
// ---------------------------------------------------------------------------
function initScrollBlur(lenis) {
    const covers = document.querySelectorAll('.portfolio-media');
    if (!covers.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        covers.forEach((el) => {
            el.style.setProperty('--blur', '0px');
            el.style.setProperty('--blur-scale', '1');
        });
        return;
    }

    const MAX_BLUR = 14;   // px at progress 0
    const TRAVEL = 0.55;   // fraction of viewport height over which the blur clears
    let ticking = false;

    function update() {
        ticking = false;
        const vh = window.innerHeight;
        covers.forEach((el) => {
            const top = el.getBoundingClientRect().top;
            const progress = Math.min(1, Math.max(0, (vh - top) / (vh * TRAVEL)));
            // ease-out so the last bit of blur lingers then clears softly
            const eased = 1 - Math.pow(1 - progress, 2);
            el.style.setProperty('--blur', ((1 - eased) * MAX_BLUR).toFixed(2) + 'px');
            el.style.setProperty('--blur-scale', (1 + (1 - eased) * 0.06).toFixed(4));
        });
    }

    function request() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
    }

    if (lenis) lenis.on('scroll', request);
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    update();
}

// ---------------------------------------------------------------------------
// Preloader
// Runs the label sequence over a minimum duration, waits for window load, then wipes
// the overlay upward and fires "preloader:done".
// ---------------------------------------------------------------------------
function initPreloader() {
    const preloader = document.getElementById('preloader');
    if (!preloader) {
        document.dispatchEvent(new CustomEvent('preloader:done'));
        return;
    }

    const html = document.documentElement;
    const countEl = document.getElementById('preloaderCount');
    const barEl = document.getElementById('preloaderBar');
    const labelEl = document.getElementById('preloaderLabel');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Label sequence: each entry is [delay in ms, text]. The counter finishes after the last one.
    const PHASES = reduceMotion
        ? [[0, 'Starting up...']]
        : [[0, 'Please wait...'], [1500, 'Starting up...']];
    const MIN_DURATION = reduceMotion ? 250 : 3000; // ms the counter takes to reach 100%
    const HOLD_AT = 92;                              // where to wait if assets are still loading
    const start = performance.now();
    let loaded = document.readyState === 'complete';
    let finished = false;

    html.classList.add('is-loading');
    window.addEventListener('load', () => { loaded = true; }, { once: true });

    // Swap the label on a timer, with a short crossfade between phases
    PHASES.forEach(([delay, text], index) => {
        setTimeout(() => {
            if (!labelEl) return;
            if (index === 0) { labelEl.textContent = text; return; }
            labelEl.classList.add('is-swapping');
            setTimeout(() => {
                labelEl.textContent = text;
                labelEl.classList.remove('is-swapping');
            }, 200);
        }, delay);
    });

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    function tick(now) {
        const t = Math.min(1, (now - start) / MIN_DURATION);
        let progress = easeOutCubic(t) * 100;
        if (!loaded) progress = Math.min(progress, HOLD_AT);

        if (countEl) countEl.textContent = Math.round(progress) + '%';
        if (barEl) barEl.style.transform = `scaleX(${progress / 100})`;

        if (progress >= 100 && loaded) {
            finish();
        } else {
            requestAnimationFrame(tick);
        }
    }

    function finish() {
        if (finished) return;
        finished = true;
        // Brief pause on 100 before the wipe
        setTimeout(() => {
            preloader.classList.add('is-done');
            html.classList.remove('is-loading');
            document.dispatchEvent(new CustomEvent('preloader:done'));

            let removed = false;
            const remove = () => {
                if (removed) return;
                removed = true;
                preloader.remove();
            };
            // Only the panel's own wipe counts; child opacity transitions bubble up too
            preloader.addEventListener('transitionend', (event) => {
                if (event.target === preloader) remove();
            });
            setTimeout(remove, 2000); // safety net if transitionend never fires
        }, reduceMotion ? 0 : 250);
    }

    requestAnimationFrame(tick);
}

// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    splitWords();
    const lenis = initSmoothScroll();
    if (lenis) lenis.stop(); // no scrolling while the preloader is up

    document.addEventListener('preloader:done', () => {
        if (lenis) lenis.start();
        initReveal();
        initScrollBlur(lenis);
    }, { once: true });

    initPreloader();
});

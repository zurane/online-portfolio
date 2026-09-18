
document.addEventListener('DOMContentLoaded', () => {

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

    // Observe all reveal elements
    revealElements.forEach((element) => {
        revealObserver.observe(element);
    });
});

// Smooth scrolling (Lenis, loaded from CDN in index.html)
document.addEventListener('DOMContentLoaded', () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof Lenis === 'undefined' || reduceMotion) return;

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
});


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

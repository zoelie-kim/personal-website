// Intersection Observer for projects section
const projectsSection = document.getElementById('projects');
if (projectsSection) {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    observer.observe(projectsSection);
}

// Intersection Observer for project cards
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.classList.add('visible');
            }, index * 100);
        }
    });
}, observerOptions);

// Observe project cards for scroll animations
document.querySelectorAll('.project-card').forEach(card => {
    cardObserver.observe(card);
});

// Photo carousel: an endless strip driven by native horizontal scrolling, so
// trackpad and touch gestures keep working alongside the arrow buttons.
const carouselViewport = document.querySelector('.carousel-viewport');
const carouselTrack = document.querySelector('.carousel-track');
const carouselPrev = document.getElementById('carouselPrev');
const carouselNext = document.getElementById('carouselNext');

if (carouselViewport && carouselTrack && carouselPrev && carouselNext) {
    // Three identical copies of the photo list, sitting one after another. We
    // park the view on the middle copy, so there is always a full set of
    // photos to scroll into in either direction. Once scrolling settles we
    // silently shift back to the middle copy — because the copies are
    // identical, the jump is invisible and the strip feels endless.
    const originals = Array.from(carouselTrack.children);

    const buildCopy = () => {
        const fragment = document.createDocumentFragment();
        originals.forEach(item => {
            const clone = item.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            fragment.appendChild(clone);
        });
        return fragment;
    };

    carouselTrack.prepend(buildCopy());
    carouselTrack.append(buildCopy());

    const copyWidth = () => carouselTrack.scrollWidth / 3;

    // Instant, non-animated scroll — used for the invisible repositioning.
    const jumpTo = (x) => {
        const previous = carouselViewport.style.scrollBehavior;
        carouselViewport.style.scrollBehavior = 'auto';
        carouselViewport.scrollLeft = x;
        carouselViewport.style.scrollBehavior = previous;
    };

    const recentre = () => {
        const width = copyWidth();
        if (width === 0) return;   // section still hidden, nothing to measure
        if (carouselViewport.scrollLeft < width * 0.5) {
            jumpTo(carouselViewport.scrollLeft + width);
        } else if (carouselViewport.scrollLeft > width * 1.5) {
            jumpTo(carouselViewport.scrollLeft - width);
        }
    };

    // Scroll just under a full viewport so one photo carries over between
    // clicks as a visual anchor, instead of the whole strip changing at once.
    const step = () => carouselViewport.clientWidth * 0.8;

    carouselPrev.addEventListener('click', () => {
        carouselViewport.scrollBy({ left: -step(), behavior: 'smooth' });
    });

    carouselNext.addEventListener('click', () => {
        carouselViewport.scrollBy({ left: step(), behavior: 'smooth' });
    });

    // Recentre only once scrolling has settled. Repositioning mid-animation
    // would cancel the smooth scroll and look like a stutter.
    let settleTimer;
    carouselViewport.addEventListener('scroll', () => {
        clearTimeout(settleTimer);
        settleTimer = setTimeout(recentre, 140);
    }, { passive: true });

    // The carousel lives inside a display:none section, so it measures 0x0
    // until About opens — park it on the middle copy at that point. The
    // timeout defers past the separate handler that adds the .active class.
    const aboutTrigger = document.getElementById('aboutBtn');
    if (aboutTrigger) {
        aboutTrigger.addEventListener('click', () => {
            setTimeout(() => jumpTo(copyWidth()), 0);
        });
    }

    jumpTo(copyWidth());
}


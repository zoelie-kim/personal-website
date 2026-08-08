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

// Intersection Observer for project rows
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const entryObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.classList.add('visible');
            }, index * 100);
        }
    });
}, observerOptions);

// Observe project rows for scroll animations
document.querySelectorAll('.project-entry').forEach(row => {
    entryObserver.observe(row);
});

// Project filters. Categories are multi-valued, so this shows and hides rows
// rather than splitting them into exclusive groups.
const filterChips = document.querySelectorAll('.filter-chip');

if (filterChips.length) {
    const projectEntries = document.querySelectorAll('.project-entry');
    const projectsList = document.querySelector('.projects-list');

    // Filtering can be invisible from the top of the page: NeuroHealth is the
    // first row under most filters, so the first screen looks identical before
    // and after. Replaying a quick fade-up on the matching rows makes the click
    // register without having to scroll. Deliberately much faster than the 0.6s
    // scroll reveal — this is button feedback, not an entrance.
    const STAGGER_MS = 55;
    const DURATION_MS = 420;
    let refreshTimer;

    const replayEntrance = (shown) => {
        projectsList.classList.add('is-filtering');

        shown.forEach((entry, i) => {
            entry.classList.remove('visible');
            entry.classList.add('filter-enter');
            entry.style.transitionDelay = `${i * STAGGER_MS}ms`;
        });

        // Reading a layout property flushes the reset, so the browser records
        // it as the transition's start value instead of collapsing both states
        // into one frame. This has to stay synchronous: requestAnimationFrame
        // never fires while a tab is backgrounded, which would strand every row
        // at opacity 0 until the next click.
        void projectsList.offsetHeight;

        shown.forEach(entry => {
            entry.classList.remove('filter-enter');
            entry.classList.add('visible');
        });

        // Hand the rows back to the normal scroll-reveal timing once the replay
        // is done, and drop the stagger so it can't leak into it. Also re-asserts
        // the end state, so an interrupted run still settles visible.
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
            projectsList.classList.remove('is-filtering');
            shown.forEach(entry => {
                entry.style.transitionDelay = '';
                entry.classList.remove('filter-enter');
                entry.classList.add('visible');
            });
        }, DURATION_MS + shown.length * STAGGER_MS + 50);
    };

    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const filter = chip.dataset.filter;

            filterChips.forEach(other => {
                const isActive = other === chip;
                other.classList.toggle('active', isActive);
                other.setAttribute('aria-pressed', String(isActive));
            });

            const shown = [];
            projectEntries.forEach(entry => {
                const categories = (entry.dataset.categories || '').split(' ');
                const matches = filter === 'all' || categories.includes(filter);
                entry.hidden = !matches;
                if (matches) shown.push(entry);
            });

            replayEntrance(shown);
        });
    });
}

// Photo carousel: an endless strip. Three identical copies of the photo list
// sit end to end and the view parks on the middle one, so there is always a
// full set to scroll into in either direction. Whenever the view drifts onto a
// neighbouring copy it is shifted back by exactly one copy width — the copies
// are identical, so the shift lands on the same picture and is invisible.
//
// The photos appear in the order the figures are written in index.html. To
// change what shows first, move the markup — nothing here needs editing.
const carouselViewport = document.querySelector('.carousel-viewport');
const carouselTrack = document.querySelector('.carousel-track');
const carouselPrev = document.getElementById('carouselPrev');
const carouselNext = document.getElementById('carouselNext');

if (carouselViewport && carouselTrack && carouselPrev && carouselNext) {
    const originals = Array.from(carouselTrack.children);

    const buildCopy = () => {
        const fragment = document.createDocumentFragment();
        originals.forEach(item => {
            const clone = item.cloneNode(true);
            // Screen readers announce the real list once, not three times.
            clone.setAttribute('aria-hidden', 'true');
            fragment.appendChild(clone);
        });
        return fragment;
    };

    carouselTrack.prepend(buildCopy());
    carouselTrack.append(buildCopy());

    const copyWidth = () => carouselTrack.scrollWidth / 3;

    // The animation below is hand-driven rather than handed to the browser's
    // smooth scrolling, because the wrap has to be able to move the strip
    // mid-flight. A native smooth scroll cancels the moment anything else
    // writes the scroll position — that cancellation was the old stutter.
    // Owning the animation means a wrap just shifts its start and end by the
    // same amount and it keeps gliding.
    let frameId = null;
    let from = 0;
    let to = 0;
    let startedAt = 0;
    const DURATION = 450;

    // Keep the view on the middle copy. Runs on every scroll event rather than
    // on a settle timer, so a wrap never lands on top of a moving animation.
    const wrap = () => {
        const width = copyWidth();
        if (!width) return;   // section hidden, nothing to measure

        let shift = 0;
        if (carouselViewport.scrollLeft < width * 0.5) shift = width;
        else if (carouselViewport.scrollLeft >= width * 1.5) shift = -width;
        if (!shift) return;

        carouselViewport.scrollLeft += shift;
        // Carry any in-flight animation across the seam with the strip.
        if (frameId !== null) {
            from += shift;
            to += shift;
        }
    };

    carouselViewport.addEventListener('scroll', wrap, { passive: true });

    // Just under a full viewport, so one photo carries over between clicks as
    // a visual anchor instead of the whole strip changing at once.
    const step = () => carouselViewport.clientWidth * 0.8;

    const glideBy = (distance) => {
        if (frameId !== null) cancelAnimationFrame(frameId);

        from = carouselViewport.scrollLeft;
        to = from + distance;

        // Animation can trigger motion sensitivity, so jump straight there.
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            carouselViewport.scrollLeft = to;
            frameId = null;
            return;
        }

        startedAt = performance.now();

        const frame = (now) => {
            const progress = Math.min(1, (now - startedAt) / DURATION);
            // Ease-out cubic: quick to leave, gentle to arrive.
            const eased = 1 - Math.pow(1 - progress, 3);
            carouselViewport.scrollLeft = from + (to - from) * eased;

            if (progress < 1) {
                frameId = requestAnimationFrame(frame);
            } else {
                frameId = null;
                wrap();
            }
        };

        frameId = requestAnimationFrame(frame);
    };

    carouselPrev.addEventListener('click', () => glideBy(-step()));
    carouselNext.addEventListener('click', () => glideBy(step()));

    // Park on the first photo of the middle copy.
    carouselViewport.scrollLeft = copyWidth();
}


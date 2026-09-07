/* ===================================
   Minyar Frifita — Portfolio JavaScript
   Particles · Animations · Interactions
   =================================== */

document.addEventListener('DOMContentLoaded', () => {
    let mouseX = 0, mouseY = 0;

    // ===== CURSOR GLOW =====
    const cursorGlow = document.getElementById('cursorGlow');
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursorGlow.style.left = e.clientX + 'px';
        cursorGlow.style.top = e.clientY + 'px';
    });

    // ===== NAVBAR SCROLL =====
    const navbar = document.getElementById('navbar');
    const sections = document.querySelectorAll('.section, .hero');
    const navLinks = document.querySelectorAll('.nav-link');

    function handleScroll() {
        // Navbar background
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Active section highlighting
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 150;
            if (window.scrollY >= sectionTop) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    }

    window.addEventListener('scroll', handleScroll, { passive: true });

    // ===== MOBILE MENU =====
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileLinks = document.querySelectorAll('.mobile-link');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        mobileMenu.classList.toggle('open');
        document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });

    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('open');
            document.body.style.overflow = '';
        });
    });

    // ===== HERO ANIMATION ON LOAD =====
    const heroAnimateElements = document.querySelectorAll('.animate-in');
    setTimeout(() => {
        heroAnimateElements.forEach(el => {
            el.classList.add('visible');
        });
    }, 200);

    // ===== SCROLL REVEAL =====
    const revealElements = document.querySelectorAll(
        '.section .glass-card, .section .timeline-item, .section .edu-card, .section .cert-card'
    );

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Staggered reveal
                setTimeout(() => {
                    entry.target.classList.add('revealed');
                }, index * 80);
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => {
        revealObserver.observe(el);
    });

    // Section headers also animate
    const sectionHeaders = document.querySelectorAll('.section-header');
    const headerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                headerObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    sectionHeaders.forEach(header => {
        header.style.opacity = '0';
        header.style.transform = 'translateY(25px)';
        header.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        headerObserver.observe(header);
    });

    // ===== STAT COUNTER ANIMATION =====
    const statNumbers = document.querySelectorAll('.stat-number');
    let statsCounted = false;

    function animateCounters() {
        if (statsCounted) return;
        statsCounted = true;

        statNumbers.forEach(num => {
            const target = parseInt(num.getAttribute('data-target'));
            const duration = 1500;
            const start = performance.now();

            function updateCount(currentTime) {
                const elapsed = currentTime - start;
                const progress = Math.min(elapsed / duration, 1);
                // Ease out cubic
                const eased = 1 - Math.pow(1 - progress, 3);
                num.textContent = Math.floor(target * eased);

                if (progress < 1) {
                    requestAnimationFrame(updateCount);
                } else {
                    num.textContent = target;
                }
            }
            requestAnimationFrame(updateCount);
        });
    }

    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    const statsContainer = document.querySelector('.hero-stats');
    if (statsContainer) {
        statsObserver.observe(statsContainer);
    }

    // ===== PROJECT FILTERS =====
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.getAttribute('data-filter');

            projectCards.forEach(card => {
                const categories = card.getAttribute('data-category');
                if (filter === 'all' || categories.includes(filter)) {
                    card.classList.remove('hidden');
                    card.style.animation = 'fadeInUp 0.4s ease forwards';
                } else {
                    card.classList.add('hidden');
                }
            });
        });
    });

    // ===== SMOOTH SCROLL for all anchor links =====
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // ===== TYPING EFFECT FOR CODE CARD =====
    // Subtle glow animation on hover for skill tags
    document.querySelectorAll('.skill-tag').forEach(tag => {
        tag.addEventListener('mouseenter', function() {
            this.style.boxShadow = '0 0 15px rgba(139, 92, 246, 0.2)';
        });
        tag.addEventListener('mouseleave', function() {
            this.style.boxShadow = 'none';
        });
    });

    // ===== TILT EFFECT FOR PROJECT CARDS =====
    document.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    });

    // ===== FADE IN UP KEYFRAME (dynamically added) =====
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(styleSheet);

    // ===== JCI SPECIFICATIONS MODAL LOGIC =====
    const jciModal = document.getElementById('jciModal');
    const openJciModalBtn = document.getElementById('openJciModalBtn');
    const closeJciModalBtn = document.getElementById('closeJciModalBtn');
    const closeJciModalFooterBtn = document.getElementById('closeJciModalFooterBtn');

    function openModal() {
        if (!jciModal) return;
        jciModal.classList.add('active');
        jciModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        if (!jciModal) return;
        jciModal.classList.remove('active');
        jciModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    if (openJciModalBtn) {
        openJciModalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openModal();
        });
    }

    if (closeJciModalBtn) {
        closeJciModalBtn.addEventListener('click', closeModal);
    }

    if (closeJciModalFooterBtn) {
        closeJciModalFooterBtn.addEventListener('click', closeModal);
    }

    if (jciModal) {
        jciModal.addEventListener('click', (e) => {
            if (e.target === jciModal) {
                closeModal();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && jciModal && jciModal.classList.contains('active')) {
            closeModal();
        }
    });
});

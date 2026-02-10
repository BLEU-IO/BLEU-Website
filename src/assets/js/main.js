// Minimal JavaScript for the blog
// Only progressive enhancement - site works without JS

document.addEventListener('DOMContentLoaded', () => {
    // Tag filtering (optional enhancement)
    const tagLinks = document.querySelectorAll('[data-tag]');
    const blogCards = document.querySelectorAll('[data-tags]');

    tagLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tag = link.dataset.tag;

            blogCards.forEach(card => {
                const cardTags = card.dataset.tags?.split(',') || [];
                if (cardTags.includes(tag)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });

            // Update active state
            tagLinks.forEach(l => l.classList.remove('bg-bleu-200'));
            link.classList.add('bg-bleu-200');
        });
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
});

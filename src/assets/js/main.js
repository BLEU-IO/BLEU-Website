document.addEventListener("DOMContentLoaded", () => {
    const currentLocale = window.location.pathname.startsWith("/en/") || window.location.pathname === "/en/"
        ? "en"
        : "ar";

    try {
        window.localStorage.setItem("bleu-locale", currentLocale);
    } catch (error) {
        // Ignore storage failures and continue with URL-based locale.
    }

    const tagLinks = document.querySelectorAll("[data-tag]");
    const blogCards = document.querySelectorAll("[data-tags]");

    tagLinks.forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            const tag = link.dataset.tag;

            blogCards.forEach((card) => {
                const cardTags = card.dataset.tags?.split(",") || [];
                card.style.display = cardTags.includes(tag) ? "block" : "none";
            });

            tagLinks.forEach((tagLink) => tagLink.classList.remove("bg-bleu-200"));
            link.classList.add("bg-bleu-200");
        });
    });

    document.querySelectorAll(".lang-switcher").forEach((switcher) => {
        switcher.addEventListener("change", (event) => {
            const targetUrl = event.target.value;
            const targetLocale = targetUrl.startsWith("/en/") || targetUrl === "/en/" ? "en" : "ar";

            try {
                window.localStorage.setItem("bleu-locale", targetLocale);
            } catch (error) {
                // Ignore storage failures and continue navigating.
            }

            window.location.assign(targetUrl);
        });
    });

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener("click", (event) => {
            event.preventDefault();
            const target = document.querySelector(anchor.getAttribute("href"));
            if (target) {
                target.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });
    });

    const scrollPlayVideos = document.querySelectorAll("video[data-scroll-play]");

    if ("IntersectionObserver" in window) {
        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const video = entry.target;

                if (entry.isIntersecting) {
                    video.play().catch(() => {
                        // Browsers can still block playback; controls remain available.
                    });
                } else {
                    video.pause();
                }
            });
        }, { threshold: 0.35 });

        scrollPlayVideos.forEach((video) => videoObserver.observe(video));
    }
});

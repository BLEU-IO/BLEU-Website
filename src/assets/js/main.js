document.addEventListener("DOMContentLoaded", () => {
    const currentLocale = window.location.pathname.startsWith("/ar/") || window.location.pathname === "/ar/"
        ? "ar"
        : "en";

    try {
        window.localStorage.setItem("bleu-locale", currentLocale);
    } catch (error) {
        // Ignore storage failures and continue with URL-based locale.
    }

    const THEME_STORAGE_KEY = "bleu-theme";

    const updateGiscusTheme = (theme) => {
        const script = document.getElementById("giscus-script");
        if (script) {
            script.setAttribute("data-theme", theme);
        }

        const iframe = document.querySelector("iframe.giscus-frame");
        if (iframe) {
            iframe.contentWindow.postMessage(
                { giscus: { setConfig: { theme } } },
                "https://giscus.app"
            );
        }
    };

    const setTheme = (theme) => {
        document.documentElement.classList.toggle("dark", theme === "dark");

        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch (error) {
            // Ignore storage failures; the toggle still works for this session.
        }

        updateGiscusTheme(theme);
    };

    const resolveTheme = () => {
        try {
            const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
            if (stored === "dark" || stored === "light") {
                return stored;
            }
        } catch (error) {
            // Fall through to the system preference.
        }

        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    };

    document.querySelectorAll(".theme-toggle").forEach((button) => {
        button.addEventListener("click", () => {
            setTheme(resolveTheme() === "dark" ? "light" : "dark");
        });
    });

    // Keep the giscus widget in sync with the theme resolved in the head script.
    updateGiscusTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");

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

            tagLinks.forEach((tagLink) => tagLink.classList.remove("bg-bleu-200", "dark:bg-bleu-800"));
            link.classList.add("bg-bleu-200", "dark:bg-bleu-800");
        });
    });

    document.querySelectorAll(".lang-switcher").forEach((switcher) => {
        switcher.addEventListener("change", (event) => {
            const targetUrl = event.target.value;
            const targetLocale = targetUrl.startsWith("/ar/") || targetUrl === "/ar/" ? "ar" : "en";

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

const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const {
    createI18nInstance,
    localizeUrl,
    validateResources
} = require("./src/i18n");

module.exports = function (eleventyConfig) {
    validateResources();
    const i18n = createI18nInstance();

    // Plugins
    eleventyConfig.addPlugin(syntaxHighlight);

    // Copy static assets to public paths used by templates
    eleventyConfig.addPassthroughCopy({ "src/assets/images": "assets/images" });
    eleventyConfig.addPassthroughCopy({ "src/assets/js": "assets/js" });

    function getBlogPosts(collectionApi) {
        return collectionApi.getFilteredByGlob("content/blogs/*.md")
            .filter(post => post.fileSlug !== "0template")
            .sort((a, b) => b.date - a.date);
    }

    // Blog collection sorted by date (newest first)
    eleventyConfig.addCollection("blogs", function (collectionApi) {
        return getBlogPosts(collectionApi);
    });

    // Get unique tags from all blogs
    eleventyConfig.addCollection("blogTags", function (collectionApi) {
        const tags = new Set();
        getBlogPosts(collectionApi).forEach(post => {
            if (post.data.tags) {
                post.data.tags.forEach(tag => tags.add(tag));
            }
        });
        return [...tags].sort();
    });

    // Date formatting filter
    eleventyConfig.addFilter("dateFormat", function (date, locale = "ar") {
        return new Date(date).toLocaleDateString(locale === "en" ? "en-US" : "ar-EG", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    });

    eleventyConfig.addFilter("dateIso", function (date) {
        return new Date(date).toISOString().slice(0, 10);
    });

    // Reading time filter
    eleventyConfig.addFilter("readingTime", function (content) {
        if (!content) return 1;
        const words = content.split(/\s+/).length;
        return Math.max(1, Math.ceil(words / 200));
    });

    // Excerpt filter (first paragraph)
    eleventyConfig.addFilter("excerpt", function (content) {
        if (!content) return '';
        const match = content.match(/<p>(.*?)<\/p>/);
        return match ? match[1].substring(0, 160) + '...' : content.substring(0, 160) + '...';
    });

    // Limit filter for arrays
    eleventyConfig.addFilter("limit", function (arr, limit) {
        return arr.slice(0, limit);
    });

    eleventyConfig.addNunjucksGlobal("t", function (key, locale = "ar", options = {}) {
        if (!i18n.exists(key, { lng: locale })) {
            throw new Error(`Missing translation key "${key}" for locale "${locale}".`);
        }

        return i18n.t(key, { lng: locale, ...options });
    });

    eleventyConfig.addNunjucksGlobal("localeUrl", function (url, locale = "ar") {
        return localizeUrl(url, locale);
    });

    eleventyConfig.addNunjucksGlobal("alternateLocaleUrl", function (url, locale = "ar") {
        return localizeUrl(url, locale === "en" ? "ar" : "en");
    });

    // Ignore node_modules and other non-content directories
    eleventyConfig.ignores.add("node_modules/**");
    eleventyConfig.ignores.add(".git/**");
    eleventyConfig.ignores.add("README.md");
    eleventyConfig.ignores.add("CONTRIBUTING.md");
    eleventyConfig.ignores.add("content/blogs/0template.md");
    eleventyConfig.ignores.add("src/_data/**");
    eleventyConfig.ignores.add("src/_includes/**");
    eleventyConfig.ignores.add("src/assets/**");
    eleventyConfig.ignores.add("src/i18n/**");
    eleventyConfig.ignores.add("scripts/**");

    return {
        dir: {
            input: ".",
            output: "_site",
            includes: "src/_includes",
            data: "src/_data",
            layouts: "src/_includes/layouts"
        },
        templateFormats: ["njk", "md", "html"],
        htmlTemplateEngine: "njk",
        markdownTemplateEngine: "njk"
    };
};

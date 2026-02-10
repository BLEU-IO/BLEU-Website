const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

module.exports = function (eleventyConfig) {
    // Plugins
    eleventyConfig.addPlugin(syntaxHighlight);

    // Copy static assets
    eleventyConfig.addPassthroughCopy("src/assets/images");
    eleventyConfig.addPassthroughCopy("src/assets/js");

    // Blog collection sorted by date (newest first)
    eleventyConfig.addCollection("blogs", function (collectionApi) {
        return collectionApi.getFilteredByGlob("content/blogs/*.md")
            .sort((a, b) => b.date - a.date);
    });

    // Get unique tags from all blogs
    eleventyConfig.addCollection("blogTags", function (collectionApi) {
        const tags = new Set();
        collectionApi.getFilteredByGlob("content/blogs/*.md").forEach(post => {
            if (post.data.tags) {
                post.data.tags.forEach(tag => tags.add(tag));
            }
        });
        return [...tags].sort();
    });

    // Date formatting filter
    eleventyConfig.addFilter("dateFormat", function (date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
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

    // Ignore node_modules and other non-content directories
    eleventyConfig.ignores.add("node_modules/**");
    eleventyConfig.ignores.add(".git/**");
    eleventyConfig.ignores.add("README.md");
    eleventyConfig.ignores.add("CONTRIBUTING.md");
    eleventyConfig.ignores.add("src/_data/**");
    eleventyConfig.ignores.add("src/_includes/**");
    eleventyConfig.ignores.add("src/assets/**");

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


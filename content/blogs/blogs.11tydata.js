module.exports = {
    layout: "blog.njk",
    pagination: {
        data: "locales",
        size: 1,
        alias: "localeData"
    },
    eleventyComputed: {
        locale: (data) => data.localeData.code,
        lang: (data) => data.localeData.lang,
        dir: (data) => data.localeData.dir,
        permalink: (data) => {
            const slug = data.page.fileSlug;
            return data.localeData.code === "en" ? `/en/blogs/${slug}/` : `/blogs/${slug}/`;
        }
    }
};

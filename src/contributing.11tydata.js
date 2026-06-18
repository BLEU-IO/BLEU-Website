module.exports = {
    pagination: {
        data: "locales",
        size: 1,
        alias: "localeData"
    },
    eleventyComputed: {
        locale: (data) => data.localeData.code,
        lang: (data) => data.localeData.lang,
        dir: (data) => data.localeData.dir,
        permalink: (data) => `${data.localeData.prefix}/contributing/`.replace(/^\/\//, "/"),
        pageTitleKey: () => "contributing:meta.title",
        pageDescriptionKey: () => "contributing:meta.description"
    }
};

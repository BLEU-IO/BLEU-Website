const fs = require("fs");
const path = require("path");

const blogDir = path.join(__dirname, "..", "..", "content", "blogs");

function getBlogSlugs() {
    return fs.readdirSync(blogDir)
        .filter((file) => file.endsWith(".md") && file !== "0template.md")
        .map((file) => path.basename(file, ".md"))
        .sort();
}

module.exports = [
    { from: "/en/", to: "/" },
    { from: "/en/blogs/", to: "/blogs/" },
    { from: "/en/contributing/", to: "/contributing/" },
    ...getBlogSlugs().map((slug) => ({
        from: `/en/blogs/${slug}/`,
        to: `/blogs/${slug}/`
    }))
];

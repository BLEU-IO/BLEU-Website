const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "_site");
const blogDir = path.join(__dirname, "..", "content", "blogs");

function ensureExists(relativePath) {
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`Missing built file: ${relativePath}`);
    }
}

function ensureContains(relativePath, expectedText) {
    const absolutePath = path.join(root, relativePath);
    const content = fs.readFileSync(absolutePath, "utf8");
    if (!content.includes(expectedText)) {
        throw new Error(`Built file ${relativePath} does not include expected text: ${expectedText}`);
    }
}

const pages = [
    "index.html",
    path.join("ar", "index.html"),
    path.join("blogs", "index.html"),
    path.join("ar", "blogs", "index.html"),
    path.join("contributing", "index.html"),
    path.join("ar", "contributing", "index.html"),
    path.join("en", "index.html"),
    path.join("en", "blogs", "index.html"),
    path.join("en", "contributing", "index.html")
];

for (const page of pages) {
    ensureExists(page);
}

ensureContains(path.join("en", "index.html"), "url=/");
ensureContains(path.join("en", "blogs", "index.html"), "url=/blogs/");
ensureContains(path.join("en", "contributing", "index.html"), "url=/contributing/");

const postFiles = fs.readdirSync(blogDir)
    .filter((file) => file.endsWith(".md") && file !== "0template.md")
    .map((file) => path.basename(file, ".md"));

for (const slug of postFiles) {
    ensureExists(path.join("blogs", slug, "index.html"));
    ensureExists(path.join("ar", "blogs", slug, "index.html"));
    ensureExists(path.join("en", "blogs", slug, "index.html"));
    ensureContains(path.join("en", "blogs", slug, "index.html"), `url=/blogs/${slug}/`);
}

console.log("Localized build output verified.");

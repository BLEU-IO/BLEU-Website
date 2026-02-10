# 📝 How to Submit a Blog Post

We welcome contributions from the community! Our blog is fully open-source, and anyone can submit a post via GitHub Pull Request.

## Quick Start

1. **Fork** this repository
2. **Create** a new file: `content/blogs/your-title.md`
3. **Write** your post using the template below
4. **Open** a Pull Request
5. **Community reviews** your post
6. **Merged = Published!** 🎉

## Blog Template

```markdown
---
title: "Your Awesome Title"
author: "Your Name"
authorGithub: "your-github-username"
date: 2026-02-08
excerpt: "A brief description of your post (1-2 sentences)"
tags:
  - tutorial
  - javascript
thumbnail: /assets/images/your-image.jpg  # optional
layout: layouts/blog.njk
---

Your content here. Use standard Markdown!

## Subheadings

Regular paragraphs with **bold** and *italic* text.

### Code Blocks

\`\`\`javascript
function hello() {
  console.log("Hello, BLEU!");
}
\`\`\`

### Lists

- Item one
- Item two
- Item three
```

## Guidelines

- ✅ Write about tech, learning, open-source, or community topics
- ✅ Keep it respectful and constructive
- ✅ Include code examples where helpful
- ✅ Use clear, descriptive titles
- ✅ Add a thumbnail image if possible (16:9 ratio recommended)
- ❌ No promotional/spam content
- ❌ No plagiarized content

## File Naming

Name your file using kebab-case:
- ✅ `getting-started-with-rust.md`
- ✅ `my-open-source-journey.md`
- ❌ `My Blog Post.md`
- ❌ `post1.md`

## Adding Images

1. Put images in `src/assets/images/`
2. Reference them as `/assets/images/your-image.jpg`

## Review Process

1. Open your Pull Request
2. Maintainers review for quality and guidelines
3. You may receive feedback or suggestions
4. Once approved, your PR is merged
5. GitHub Actions builds and deploys automatically
6. Your blog is live within minutes!

## Local Development

```bash
cd BLEU-Website
npm install
npm run dev
```

Site will be available at `http://localhost:8080`

## Questions?

- Open an issue on GitHub
- Join our [Discord](https://discord.gg/sjU9VCT3h4) and ask in `#blog-submissions`

---

Thanks for contributing to the BLEU community! 💙

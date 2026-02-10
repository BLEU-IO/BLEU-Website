# BLEU Community Blog

A minimalistic, open-source blog platform for the BLEU tech community. Built with [Eleventy](https://www.11ty.dev/) & hosted on GitHub Pages.

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start dev server (with hot reload)
npm run dev

# Build for production
npm run build
```

### Submit a Blog

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed instructions.

TL;DR:
1. Fork this repo
2. Add `content/blogs/your-post.md`
3. Open a PR
4. Get reviewed & merged
5. Published! 🎉

## Project Structure

```
BLEU-Website/
├── content/blogs/       # Markdown blog posts
├── src/
│   ├── _data/           # Site data & Discord stats
│   ├── _includes/       # Layouts & components
│   ├── assets/          # CSS, JS, images
│   └── *.njk            # Page templates
├── .eleventy.js         # Eleventy config
└── package.json
```

## Tech Stack

- **[Eleventy](https://www.11ty.dev/)** - Static site generator
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling
- **[giscus](https://giscus.app/)** - Comments via GitHub Discussions
- **[GitHub Actions](https://github.com/features/actions)** - CI/CD
- **[GitHub Pages](https://pages.github.com/)** - Hosting

## License

MIT © BLEU Community

---

**Build • Learn • Explore • Unite**

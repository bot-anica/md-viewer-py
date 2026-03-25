# Product Marketing Context

*Last updated: 2026-03-25*

## Product Overview
**One-liner:** Drop-in Markdown viewer for any folder — install once, use everywhere as `mdview`.
**What it does:** md-viewer-py is a lightweight, pip-installable Markdown viewer that turns any directory into a browsable documentation site. It scans for `.md` files, renders them in a clean UI with syntax highlighting, Mermaid diagrams, and live reload. No config, no build step, no Node.js required.
**Product category:** Developer tools / Documentation tools / Markdown viewers
**Product type:** Open-source CLI tool (pip package)
**Business model:** Free and open source (MIT license), no monetization currently

## Target Audience
**Target companies:** Individual developers, small teams, open-source projects, documentation-heavy orgs
**Decision-makers:** Software developers, technical writers, DevRel engineers, team leads
**Primary use case:** Quickly viewing and navigating local Markdown documentation without setting up a full static site generator
**Jobs to be done:**
- "I need to read these docs without pushing to GitHub or setting up a build pipeline"
- "I want to browse project documentation locally with a nice UI"
- "I need a quick way to preview and edit Markdown files"
**Use cases:**
- Browsing project READMEs and docs folders locally
- Reviewing documentation PRs before merging
- Teaching/learning with Markdown-based course materials
- Personal knowledge bases and note collections
- Quick Markdown editing with live preview

## Problems & Pain Points
**Core problem:** Developers have Markdown files scattered across projects but no quick, pleasant way to read them locally. They either read raw Markdown in their editor, push to GitHub to see rendered output, or set up heavy static site generators.
**Why alternatives fall short:**
- GitHub rendering requires pushing code / opening browser tabs for each file
- VS Code preview is single-file, no navigation or search across files
- Static site generators (MkDocs, Docusaurus) require config, build steps, Node.js
- grip (GitHub-flavored preview) is single-file and requires GitHub API
**What it costs them:** Context switching, wasted time setting up tools, friction in documentation workflows
**Emotional tension:** Frustration at needing heavyweight tools for a simple task; annoyance at reading raw Markdown

## Competitive Landscape
**Direct:** grip (GitHub Markdown preview) — single-file only, requires GitHub API token for heavy use
**Direct:** Glow (terminal Markdown viewer) — terminal-only, no browser UI, no search across files
**Secondary:** MkDocs / Docusaurus / VitePress — full static site generators, require config + build + Node.js
**Secondary:** VS Code Markdown preview — single-file, no cross-file navigation or search
**Indirect:** Reading raw `.md` files in editor or on GitHub

## Differentiation
**Key differentiators:**
- Zero config: `pip install` and `mdview` — that's it
- No Node.js dependency (Python stdlib backend)
- Full-featured UI: sidebar, search, TOC, dark mode, live reload, editor
- Works on any folder instantly — no project structure requirements
- Single dependency (watchdog) — minimal footprint
**How we do it differently:** Built on Python's stdlib `http.server` with client-side rendering. No framework, no build step, no config files.
**Why that's better:** Developers get a polished documentation experience without any setup overhead.
**Why users choose us:** "I just want to read my docs" — md-viewer-py respects that by getting out of the way.

## Objections
| Objection | Response |
|-----------|----------|
| "I can just read Markdown in my editor" | You can, but you lose cross-file search, navigation, TOC, and the reading experience. md-viewer-py is for *reading*, not editing (though it does that too). |
| "Why not use MkDocs?" | MkDocs is great for publishing. md-viewer-py is for *browsing locally* — no config, no build, instant. Use both for different purposes. |
| "Is it maintained?" | Active development with regular releases, 4 blog posts documenting the journey, MIT licensed. |

**Anti-persona:** Teams needing a published documentation site with custom themes, versioning, and CI/CD integration. Use MkDocs/Docusaurus instead.

## Switching Dynamics
**Push:** Frustration with reading raw Markdown; annoyance at MkDocs/Docusaurus setup for simple viewing; GitHub preview requiring internet + pushing code
**Pull:** One command to beautiful docs; works offline; zero config; familiar pip install
**Habit:** "I've always just read Markdown in my editor" / "I already have MkDocs set up"
**Anxiety:** "Will it work with my files?" / "Is a Python tool going to be slow?" / "Will it be maintained?"

## Customer Language
**How they describe the problem:**
- "I just want to read these docs without all the setup"
- "Why do I need Node.js just to preview Markdown?"
- "I don't want to push to GitHub just to see how my docs look"
**How they describe us:**
- "It's like a local documentation site that just works"
- "Zero-config Markdown viewer"
- "pip install and done"
**Words to use:** lightweight, drop-in, zero-config, instant, local, browse, clean
**Words to avoid:** enterprise, platform, framework, comprehensive, robust, scalable
**Glossary:**
| Term | Meaning |
|------|---------|
| mdview | The CLI command to launch the viewer |
| Dashboard | The grid view of folders/files shown on startup |
| Live reload | Automatic browser refresh when files change on disk |

## Brand Voice
**Tone:** Technical but approachable, developer-to-developer
**Style:** Direct, concise, show-don't-tell (code examples over paragraphs)
**Personality:** Minimal, pragmatic, opinionated about simplicity

## Proof Points
**Metrics:** Production/Stable status on PyPI; Python 3.8+ support; single dependency
**Blog posts:** 4 technical blog posts documenting the build journey (social proof of active development)
**Value themes:**
| Theme | Proof |
|-------|-------|
| Zero config | `pip install md-viewer-py && mdview` — two commands to running |
| Full-featured | 14+ features: search, TOC, dark mode, editor, diagrams, live reload |
| Minimal footprint | One dependency (watchdog), stdlib HTTP server |
| Active development | 4 blog posts, regular releases, open contribution |

## Goals
**Business goal:** Grow adoption — more developers discovering and installing md-viewer-py
**Conversion action:** `pip install md-viewer-py`
**Current metrics:** Unknown (no analytics or download tracking beyond PyPI stats)

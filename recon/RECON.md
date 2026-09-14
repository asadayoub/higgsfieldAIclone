# Higgsfield Product Reconnaissance

Research date: 2026-09-14

This document records direct browser inspection of the live Higgsfield product before implementation. The inspected account was already authenticated. No paid-credit generation was submitted: the final Generate actions visibly consumed account credits, so the form, configuration, history, loading, and result surfaces were inspected without spending the account balance.

## Executive summary

Higgsfield is a dark, media-first creative suite that combines three product layers:

1. Discovery: editorial launch content, community projects, and a dense masonry feed of individual generations.
2. Creation: focused Image, Video, Effects, and studio workspaces with model-specific controls.
3. Library: a personal asset system that organizes generated image, video, and audio outputs into folders.

The core product loop is not “open a blank generator.” It is “discover something desirable, understand how it was made, recreate it with the original settings, then find the result in history.” The rebuild will concentrate on that complete loop.

## Information architecture and navigation

### Global navigation

The desktop header is a single compact horizontal rail on an almost-black background. It combines:

- Primary creation areas: Explore, Image, Video, and Audio.
- High-value tools: Genjutsu, Effects, Cinema Studio, Marketing Studio, Supercomputer, Edit, and Canvas.
- Discovery and education: Community, Contests, Academy, and Originals.
- Commercial/account controls: Pricing, Enterprise, Assets, notifications, and account menu.

The navigation prioritizes breadth and fast switching over a traditional dashboard sidebar. Several items use bright `New` or `Free` tags as compact merchandising.

### Community navigation

Community has a second centered tab rail:

- Explore: an editorial landing page with a large festival/feature hero and horizontal content shelves.
- Projects: a four-column cinematic-poster grid. Selecting a tile expands an inline project preview.
- Shots: an edge-to-edge masonry gallery of individual image and video generations.
- Originals: Higgsfield-produced work.

### Personal library

Assets uses a left sidebar instead of the community tabs. It contains search, All Assets, Favorites, media-type filters, account/folder controls, and a density slider. The main panel is a responsive asset grid or an illustrated empty state.

## Primary user journey

1. The user lands on Explore and sees editorially curated tools, presets, and community output.
2. They enter Community Shots or Projects to browse media without configuration friction.
3. Selecting a creation opens a detail surface with the media as the visual priority and secondary actions around it.
4. The user chooses Recreate/Generate, carrying prompt and generation metadata into the correct creation workspace.
5. The studio lets the user add references, edit the prompt, choose a model/preset, choose ratio/quality/duration, and see a credit cost.
6. Generate produces an asynchronous job with queued/processing feedback.
7. Completed media becomes the central result, with download, favorite, recreate, and metadata actions.
8. The result persists into History/Assets for later retrieval.

## Page-by-page observations

### Public Explore landing page

- Dense horizontal product navigation stays visible above the content.
- The first viewport is a horizontally scrollable editorial carousel, followed by task/discount merchandising and modular product cards.
- Sections use oversized media, short uppercase titles, terse supporting copy, and a single obvious action.
- Community sections expose prompts directly on media cards, making the feed educational rather than purely inspirational.
- Bright acid-lime actions are reserved for high-intent moments.

Screenshot: [`screenshots/01-landing-explore.png`](screenshots/01-landing-explore.png)

### Community Explore

- A centered sub-navigation separates Explore, Projects, Shots, and Originals.
- The hero behaves like an editorial feature: full-bleed art, large headline, metadata, CTA, thumbnail rail, and pagination.
- Content below the hero is grouped into labeled shelves with small “See all” actions.

### Community Projects

- Project tiles are consistent 16:9 posters with very small gaps and subdued borders.
- Initial loading is a stable grid of skeleton rectangles rather than a spinner.
- Clicking a tile expands an inline preview containing video, title, synopsis, creator, engagement counts, duration, and “See project.”
- Full project pages expose not only the finished film but folders, thousands of source assets, project brief, production notes, comments, and aggregate model/credit statistics.
- Product insight: transparency into process is a major differentiator.

Screenshot (useful loading-state reference): [`screenshots/02-community-projects.png`](screenshots/02-community-projects.png)

### Community Shots

- A responsive masonry grid maximizes media density while preserving each item’s native aspect ratio.
- Card chrome is mostly hidden until hover; the image itself does the work.
- Hover actions include author, favorite/like, download, and opening the shot.
- The feed visibly mixes polished editorial, fashion, lifestyle, graphic design, product, and cinematic output.

Screenshot: [`screenshots/03-community-shots.png`](screenshots/03-community-shots.png)

### Creation/project detail

- The finished media is centered in a large black stage with minimal surrounding UI.
- Title, view count, creator, likes/dislikes, comments, share, and overflow actions sit immediately below.
- Long-form project pages add folder counts, asset grids, an authored brief, production state, resources, comments, and model usage information.
- This view treats a creation as both an artifact and a reproducible project.

### Image studio

- The canvas is nearly empty until a result exists; the composer is a floating tray anchored at the bottom center.
- The tray combines reference upload, prompt, model, aspect ratio, quality, resolution, output count, and Generate without opening a separate settings page.
- The model selector is a large searchable command palette. Featured models appear first, followed by the complete catalog. Each row has a name, capability summary, and optional New/Premium badge.
- Configuration is model-dependent. The inspected GPT Image 2 setup exposed Auto ratio, High quality, 2K resolution, an Auto control, quantity, and a visible credit price.

Screenshot: [`screenshots/04-image-studio.png`](screenshots/04-image-studio.png)

### Video studio

- Video uses a persistent left configuration panel and a large right result/history canvas.
- Top-level modes are Create Video, Edit Video, and Motion Control.
- The inspected Seedance 2.5 form included reference/extend modes, image/video/audio references, prompt, element mentions, model, duration, ratio, resolution, bitrate, and a visible credit cost.
- The right panel switches between History and How it works.
- The heavier configuration deserves a sidebar; it would be cramped in the image composer tray.

### Effects/presets

- Effects begins with a visual preset card and a Change action.
- The inspected “Floating Fall” preset asked for a required character plus optional location and product references.
- Resolution, aspect ratio, prompt visibility, free-generation toggle, credit/free count, and Generate are explicit.
- History and How it works share the large right-hand stage.
- Presets reduce a complex video workflow to a small number of semantic inputs.

### Assets/history

- Search, All Assets, Favorites, Image, Video, and Audio filters live in the left rail.
- Folder creation is contextual to the signed-in identity.
- The empty state says exactly where generations will appear and offers a direct Generate CTA.
- Empty-state illustration and generous whitespace keep the screen from feeling broken.

## Visual language

### Layout and spacing

- Near-black page background with slightly lighter raised panels.
- Hairline neutral borders and 12–20px radii give hierarchy without heavy shadows.
- Media grids use narrow gutters (roughly 12–20px); tool panels use compact 8–12px internal gaps.
- Generators reserve most of the viewport for the result, keeping controls at the edge or bottom.
- Desktop density is high, but the interaction targets remain comfortably sized.

### Typography

- Clean grotesk/sans-serif throughout.
- Navigation and metadata are compact and muted.
- Editorial headings use large uppercase forms with tight line-height.
- Sentence-case body copy stays short on discovery screens and becomes long-form only on project pages.

### Color

- Background: black to charcoal (`#08090a` through `#17191c`).
- Raised controls: dark graphite (`#202226` range).
- Primary text: warm white.
- Secondary text: cool neutral gray.
- Primary action/accent: electric acid lime.
- Small pink, purple, and green chips communicate discounts, Premium, New, and Free.

### Motion and feedback

- Media previews autoplay or expose immediate play controls.
- Hover reveals actions rather than permanently covering artwork.
- Skeletons preserve gallery geometry during loading.
- Subtle tab and panel transitions avoid large route-change discontinuities.
- Generate prices and disabled states are part of the action itself, reducing surprises.

## Reusable UI components

- Global navigation rail and mobile drawer.
- Secondary tab rail.
- Masonry media card with hover overlay.
- Project poster card and inline preview.
- Creation detail modal/page.
- Prompt composer.
- Searchable model picker.
- Preset picker.
- Aspect-ratio segmented control.
- Reference uploader with preview/remove states.
- Generate button with cost/status.
- Job status card (queued, processing, failed, complete).
- Result stage with metadata/action rail.
- History grid and empty state.
- Toast, tooltip, skeleton, and keyboard-command feedback.

## State inventory

### Loading

- Full grid skeletons for project feeds.
- Media-level placeholders for unloaded imagery/video.
- Centered spinner for large result canvases.
- “Loading your generations” copy in history panels.

### Empty

- Assets empty state with illustration, explanatory copy, and Generate CTA.
- Blank generator canvas that keeps the composer visually dominant.

### Error

- Media playback exposes an “Unable to play media” fallback and manual play control.
- The rebuild should add explicit retry affordances for failed simulated jobs and failed images.

### Success

- Completed results occupy the main canvas.
- Download, favorite, recreate, share/copy, and metadata become immediately available.
- Results appear in History/Assets without a separate save step.

## Product entities and likely data model

- User or anonymous device identity.
- Community creation: title, author, prompt, media URL/type, dimensions, tags, model, preset, counts, and publication metadata.
- Project: title, synopsis, hero media, folders, assets, long-form brief, comments, collaborators, and production status.
- Generation job: prompt/configuration snapshot, input references, status, progress, error, result, timestamps, and owner.
- Model: name, provider, media type, capabilities, constraints, pricing, badges, and availability.
- Preset/effect: title, preview, required semantic inputs, defaults, supported ratios/resolutions, and model.
- Asset: generation relationship, media type, source, dimensions/duration, favorite, folder, and created time.

## Features inspected

- Public Explore landing page.
- Community Explore, Projects, project preview, full project detail, and Shots.
- Image generation composer and model catalog.
- Video generation configuration and history/how-it-works split.
- Effects preset configuration.
- Personal asset library and its empty state.
- Search, download, favorite/like, account, pricing, and navigation entry points.

## Selected implementation scope

The polished vertical slice is:

**Explore → open creation → Recreate → configure Image or Video → Generate → result → persistent History**

It will include:

- Responsive cinematic app shell.
- Searchable/filterable masonry Explore gallery using original local assets.
- Accessible creation detail modal with prompt/configuration metadata.
- Recreate action that prefills a unified studio.
- Image and Video modes with prompt, model/preset, aspect ratio, and reference preview.
- Honest zero-key generation simulator with queued, processing, success, and deterministic failure/retry states.
- Result metadata/actions and persistent anonymous history.
- Empty states, skeletons, tooltips, toasts, focus management, and mobile navigation.

## Intentionally omitted

- Real third-party image/video generation: it introduces paid credentials, unpredictable latency/cost, and deployment risk. The integration seam will be documented.
- Authentication and billing: not necessary for an evaluator to complete the core journey and would add external setup friction.
- Community posting, likes, comments, follows, and social graphs: broad but shallow relative to the judged vertical slice.
- Full project authoring, folders, collaboration, Cinema Studio, Marketing Studio, audio, canvas, and editing tools: separate products in their own right.
- Dozens of real model-specific schemas: representative model/preset options communicate the product judgment without pretending to support unavailable providers.
- Permanent storage of uploaded references: browser previews avoid collecting user media and avoid requiring paid object storage.

## Research limitations and safeguards

- The account was already authenticated, so no signup/OTP/CAPTCHA handoff was required.
- The final Generate actions showed non-zero credit costs. They were not submitted because doing so would consume the user’s balance.
- Locally saved screenshots of public pages are included above. Authenticated video/effects/library screens were also visually inspected in the live browser and are described in this document.
- No protected Higgsfield media will be copied into the implementation.


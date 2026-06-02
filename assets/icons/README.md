# Icons

All icons in EduFinance are **inline SVGs** embedded directly in `index.html`.

They are sourced from the [Lucide Icons](https://lucide.dev) library (MIT license) — 
a clean, consistent set of stroke-based SVG icons.

No icon font or external icon library is required.

## Icon style

- Stroke-based (outline), not filled
- `stroke-width: 2`
- `fill: none`
- Size: 14–18px typically

## To add a new icon

Copy any SVG from [lucide.dev](https://lucide.dev) and use inline:

```html
<svg width="16" height="16" fill="none" viewBox="0 0 24 24"
     stroke="currentColor" stroke-width="2">
  <!-- paste path here -->
</svg>
```

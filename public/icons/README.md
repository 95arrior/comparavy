# Official Tool Logos

If a logo looks wrong, place an official transparent SVG at
`public/icons/[tool-slug].svg` and set `iconPath` in `data/tools.ts`.

Example:

```ts
iconPath: "/icons/writesonic.svg",
```

Only use official or licensed transparent logo assets here. `ToolIcon` prefers
an `iconPath` asset, then a supported Simple Icons SVG, then the official
domain favicon before showing its neutral text fallback.

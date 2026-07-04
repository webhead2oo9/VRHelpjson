# Command authoring spec (format 2)

One JSON file per command in `commands/`. The filename (without `.json`) must equal `name`.
Commands render in Discord as **Components V2 cards**: a colored container of stacked blocks,
with a page dropdown when the command has pages. This repo is served by the Nexarion bot;
the format is shared with the Virtual Desktop help-center corpus, so one authoring contract
(and one proposer prompt) covers both.

## Top-level shape

```json
{
    "format": 2,
    "name": "routersetup",
    "description": "How to set up a dedicated PCVR streaming router",
    "accent_color": 5793266,
    "blocks": [ ... ],
    "pages": [
        { "name": "wiring", "title": "Wiring", "description": "Connecting the router", "blocks": [ ... ] }
    ]
}
```

| Key            | Required | Rules                                                                                     |
| -------------- | -------- | ----------------------------------------------------------------------------------------- |
| `format`       | yes      | Always `2`.                                                                                |
| `name`         | yes      | `^[a-z0-9_-]{1,32}$`, must equal the filename.                                             |
| `description`  | yes      | 1–100 chars. Shown in Discord's slash-command picker.                                      |
| `accent_color` | no       | Integer `0`–`16777215` (e.g. `5793266` = blurple). The card's left color bar.              |
| `blocks`       | *        | The initial reply. 1–30 blocks.                                                            |
| `pages`        | *        | Extra views behind a dropdown. Max 25. Each page: unique `name` (same pattern as command names), optional `title`/`description` (≤100 chars, shown in the dropdown), optional `accent_color` (defaults to the command's), and its own `blocks`. |

\* At least one of `blocks` / `pages` is required. Prefer having top-level `blocks` — without
them the initial slash reply only shows the page dropdown.

## Block types

Blocks render top-to-bottom, one component each. All text is Discord markdown
(links, `**bold**`, code blocks, emoji, `<@&role>` mentions render but never ping).

| Block     | Shape                                              | Renders as                                    |
| --------- | -------------------------------------------------- | ---------------------------------------------- |
| `heading` | `{ "type": "heading", "text": "...", "url"?: "https://..." }` | `## Large title`, linked if `url` set. Text ≤256. |
| `text`    | `{ "type": "text", "text": "..." }`                | Markdown paragraph(s). Text ≤3800.             |
| `field`   | `{ "type": "field", "name": "...", "value": "..." }` | `**Name**` over its value. Name ≤256, value ≤1024. |
| `divider` | `{ "type": "divider" }`                            | Horizontal rule with padding.                  |
| `images`  | `{ "type": "images", "urls": ["https://..."] }`    | Image gallery, 1–10 https URLs.                |
| `small`   | `{ "type": "small", "text": "..." }`               | Small grey text (footnotes, credits). Text ≤1024. |

## Budgets (CI-enforced)

Each view (the top-level `blocks`, or one page's `blocks`) must fit in one Discord message:

- **≤ 30 blocks** per view.
- **≤ 3800 rendered text characters** per view, where rendered length is:
  `heading` = 3 + text (+ url + 4 if linked) · `text` = text · `field` = name + 5 + value ·
  `small` = 3 + text · `divider`/`images` = 0.

Too much content for one view? Split it into pages.

## Worked examples

**Simple answer:**

```json
{
    "format": 2,
    "name": "iobt",
    "description": "What is IOBT and should I use it?",
    "accent_color": 3447003,
    "blocks": [
        { "type": "heading", "text": "Inside-Out Body Tracking" },
        { "type": "text", "text": "IOBT uses your headset's cameras to estimate elbow and torso position..." },
        { "type": "field", "name": "Requirements", "value": "Quest 3 or Quest 3S on v60+" },
        { "type": "small", "text": "Last updated July 2026" }
    ]
}
```

**Guide with pages and images:**

```json
{
    "format": 2,
    "name": "opalsetup",
    "description": "GL.iNet Opal dedicated router setup",
    "accent_color": 15105570,
    "blocks": [
        { "type": "heading", "text": "Opal Router Setup", "url": "https://example.com/guide" },
        { "type": "text", "text": "Pick a section from the dropdown below." }
    ],
    "pages": [
        {
            "name": "wiring",
            "title": "Wiring",
            "blocks": [
                { "type": "heading", "text": "Wiring the Opal" },
                { "type": "text", "text": "Connect the **WAN** port to your main router..." },
                { "type": "images", "urls": ["https://cdn.example.com/opal-wiring.png"] },
                { "type": "divider" },
                { "type": "field", "name": "Tip", "value": "Use the 5GHz SSID only." }
            ]
        }
    ]
}
```

## Editing via the proposals API (for LLM proposers)

Semantic patch edits address blocks via a `target` that selects where the
edit lands: `{ "kind": "block", "page"?: <page name|title|index>,
"block": <index | field-block name> }` (omit `page` for the top-level
blocks). Typical operations:

```json
{ "type": "replace_text", "old": "Quest 3 or Quest 3S on v60+", "new": "Quest 3/3S on v62+" }
{ "type": "set_property", "target": { "kind": "block", "block": 2 }, "property": "value", "old": "Quest 3 or Quest 3S on v60+", "new": "Quest 3/3S on v62+" }
{ "type": "insert_item", "item_type": "block", "target": { "page": "wiring" }, "position": 3, "item": { "type": "divider" } }
{ "type": "remove_item", "target": { "kind": "block", "page": "wiring", "block": 4 }, "old": { "type": "field", "name": "Tip", "value": "Use the 5GHz SSID only." } }
{ "type": "move_item", "target": { "kind": "block", "block": 1 }, "position": "end" }
```

Rules: `replace_text` must match exactly once across the file's visible text
(`old` non-empty, scope with `target`/`property` when the text repeats).
`set_property`/`remove_item`/`move_item` carry an `old` guard that must
deep-equal the live value. Pages are referenced by index or by name/title;
blocks by index or (for `field` blocks) by exact name — any ambiguity is
rejected as a conflict. `position` is an integer or `"end"`.

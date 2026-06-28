# Clínica Fácil — Design System

> A reference for the visual language of **Clínica Fácil** ("Easy Clinic"), reconstructed
> from the source styles in `src/app/client/stylesheets/` and the Blaze templates in
> `src/app/client/views/`.

This is a legacy Meteor 1.4 + Blaze app built on top of the **INSPINIA** Bootstrap 3 admin
theme. The design tokens live in LESS variables (`globals/variables.import.less`), compiled
through `style.less`. Project-specific overrides live in `stylesheets/clinica-facil.css` and
per-template CSS files. UI language is Brazilian Portuguese (pt-BR), with en/es i18n.

> **Working within this system:** This is a pinned legacy stack. Reuse the existing tokens,
> Bootstrap 3 grid, INSPINIA components (`ibox`, `page-heading`), and Font Awesome 4 icons.
> Don't introduce new frameworks, CSS custom properties, or modern build tooling — match the
> idioms already in the codebase. New colors should be expressed against the LESS variables
> below, not hard-coded hexes scattered through templates.

---

## 1. Brand

- **Product name:** Clínica Fácil (displayed in the login logo and as the `branding` element).
- **Logo mark:** `CF` monogram (`.logo-element` in the collapsed sidebar) on the primary
  green background.
- **Tone:** Clean clinical/administrative dashboard — light content area, dark navigation,
  a single calm green as the signature color.

---

## 2. Color

The palette is defined as LESS variables in
[variables.import.less](../src/app/client/stylesheets/globals/variables.import.less).

### 2.1 Core / semantic colors

| Token | Hex | Role | Bootstrap mapping |
|-------|-----|------|-------------------|
| `@navy` | `#1ab394` | **Primary** brand green | `.btn-primary`, `.bg-success`, `.text-navy`, progress bars |
| `@blue` | `#1c84c6` | **Success** | `.btn-success`, `.text-success` |
| `@lazur` | `#23c6c8` | **Info** (teal) | `.btn-info`, `.text-info` |
| `@yellow` | `#f8ac59` | **Warning** (amber) | `.btn-warning`, `.text-warning` |
| `@red` | `#ED5565` | **Danger** | `.btn-danger`, `.text-danger` |
| `@dark-gray` | `#c2c2c2` | Default / muted control | `.btn-default` accents |

> ⚠️ **Naming caveat:** the variable names are misleading. `@navy` is actually the **green
> brand color** and is mapped to Bootstrap's *primary* and *success-background* roles, while
> the literal `@blue` is mapped to the *success* button. Keep this in mind when reading the
> source — go by the role column, not the variable name.

### 2.2 Neutrals & surfaces

| Token | Hex | Role |
|-------|-----|------|
| `@text-color` | `#676a6c` | Body text |
| `@gray` | `#f3f3f4` | Content background (`.gray-bg`, page wrapper) |
| `@light-gray` | `#D1DADE` | Default label / badge background |
| `@label-badget-color` | `#5E5E5E` | Default label / badge text |
| `@light-blue` | `#f3f6fb` | Subtle panel heading background (`.ibox-heading`) |
| `@border-color` | `#e7eaec` | All hairline borders / dividers (ibox, tables, footer) |
| `@ibox-title-bg` / `@ibox-content-bg` | `#ffffff` | Card (ibox) surfaces |
| — | `#262626` | Inverse / black background (`.black-bg`, `.label-inverse`) |

### 2.3 Navigation (dark sidebar)

| Token | Hex | Role |
|-------|-----|------|
| `@nav-bg` | `#2F4050` | Sidebar + body background (dark slate) |
| `@nav-text-color` | `#a7b1c2` | Sidebar link text |
| — | `#ffffff` | Active/hover sidebar link text |
| — | `#36C1FF` (clinica-facil.css) | Sidebar menu icon color (`#side-menu .fa`) |

The `<body>` background is the dark slate `#2f4050`; the light `.gray-bg` content wrapper
sits on top inside `#page-wrapper`, producing the classic dark-rail / light-canvas layout.

### 2.4 Project-specific accents (`clinica-facil.css`)

| Selector | Color | Use |
|----------|-------|-----|
| `.search-choice` | bg `#1ab394`, white text | Selected chosen.js tags (brand green) |
| `.dataTable tbody tr:hover` | `#E0F2F1` | Row hover (pale teal-green) |
| `.highlight` | `yellow` | Search-term highlight |

### 2.5 Tints used in components

- `#3dc7ab` — light navy progress bar (`.progress-bar-navy-light`)
- `#f9f9f9` / `#f8fafb` — subtle off-white fills (sidebar titles, modal body)
- `#F5F5F6` — bordered table header fill
- Button states derive automatically: hover/active = `darken(color, 3%)`, disabled =
  `lighten(color, 4%)`.

---

## 3. Typography

Defined in [base.import.less](../src/app/client/stylesheets/globals/base.import.less) and
[typography.import.less](../src/app/client/stylesheets/globals/typography.import.less).

- **Font family:** `"Open Sans", "Helvetica Neue", Helvetica, Arial, sans-serif`
- **Loaded weights:** Open Sans 300, 400, 600, 700 (Google Fonts, imported in `style.less`).
- **Base size:** `13px` on `<body>`, color `@text-color` (`#676a6c`).
- **Line height:** `1.42857` (Bootstrap default) for tables/text.

### 3.1 Headings

Headings are intentionally **thin** (`font-weight: 100`) by default, with `h3–h5` switched to
semibold `600` and a small `5px` top margin.

| Element | Size | Weight |
|---------|------|--------|
| `h1` | 30px | 100 |
| `h2` | 24px | 100 |
| `h3` | 16px | 600 |
| `h4` | 14px | 600 |
| `h5` | 12px | 600 |
| `h6` | 10px | 100 |

- `h2` is the standard **page title** (rendered inside `.page-heading`).
- `h5` is the standard **card (ibox) title**, shown at 14px / inline-block.

### 3.2 Weight & style utilities

- `.font-bold` → 600, `.font-noraml` *(sic)* → 400
- `.text-uppercase`, `.font-italic`
- `.text-muted` → `#888888`, `.text-white` → `#fff`
- Text color helpers map to semantic colors: `.text-navy`, `.text-success`, `.text-info`,
  `.text-warning`, `.text-danger`.

---

## 4. Layout & spacing

### 4.1 Shell structure

The app shell (`mainLayout`) is the INSPINIA two-region layout:

```
#wrapper
├── nav.navbar-static-side      ← dark fixed sidebar (220px)
└── #page-wrapper .gray-bg      ← light content, margin-left: 240px @ ≥768px
    ├── topNavbar
    ├── {{> content}}           ← dynamic page
    └── footer
```

Key metrics:

- **Sidebar width:** `@sidebar-width: 220px` (content offset is `240px` at `≥768px`).
- **Boxed layout max width:** `@boxed-width: 1200px` (`1300px` for top-navigation variant).
- **Content padding:** `.wrapper` = `0 20px`; `.wrapper-content` = `20px 10px 40px`.
- **Page wrapper:** `0 15px`, `min-height: 568px`.
- Grid is **Bootstrap 3** (`.row`, `.col-sm-*`, `.col-lg-*`).

### 4.2 Standard page composition

Every feature page follows this pattern (see `specialtyList`, patient forms, etc.):

```html
{{> pageHeading title='...'}}                         <!-- h2 + breadcrumb -->
<div class="wrapper wrapper-content animated fadeInRight">
  <div class="row">
    <div class="col-sm-12">
      <div class="ibox">
        <div class="ibox-title"> <h5>Title <small>…</small></h5> … </div>
        <div class="ibox-content"> … </div>
        <div class="ibox-footer"></div>
      </div>
    </div>
  </div>
</div>
```

- **`pageHeading`** ([page-heading.html](../src/app/client/views/common/page-heading.html)):
  white bar with bottom border, `h2` title + `.breadcrumb` (Dashboard › Category › Active).
- Pages enter with the `animated fadeInRight` (animate.css) transition.

### 4.3 Spacing scale (utility classes)

INSPINIA ships a dense utility set (`base.import.less`). Use these rather than inline styles.

**Named step scale** (used by paddings/margins via suffixes):

| Suffix | Value |
|--------|-------|
| `xxs` | 1–5px |
| `xs` | 5px |
| `sm` | 10px |
| *(base)* | 15px |
| `md` | 20px |
| `lg` | 30px |
| `xl` | 40px |

- **Padding:** `.p-xxs … .p-xl` (all sides), `.p-w-*` (horizontal), `.p-h-*` (vertical).
- **Margin:** `.m-xs … .m-xl`, directional `.m-t-*`, `.m-r-*`, `.m-b-*`, `.m-l-*`, plus
  **negative** variants (`.m-t-n-sm`, etc.) and `.m-n` (reset).
- **Vertical rhythm:** `.space-15 / -20 / -25 / -30` (margin top+bottom).
- **Resets:** `.no-padding`, `.no-margins`, `.no-borders`, `.no-top-border`, `.full-width`.

### 4.4 Border radius

- **Buttons:** `@btn-border-radius: 3px`.
- **Cards / modals:** `4px`.
- **Radius utilities:** `.b-r-xs` (1px), `.b-r-sm` (3px), `.b-r-md` (6px), `.b-r-lg` (12px),
  `.b-r-xl` (24px); `.btn-rounded` → 50px pill.

### 4.5 Image sizing utilities

`.img-sm` 32px · `.img-md` 64px · `.img-lg` 96px · `.img-circle` / `.circle-border`
(round avatars, 6px white ring).

---

## 5. Components

### 5.1 IBox (the primary card / panel)

The fundamental content container. Defined in `base.import.less`.

- **`.ibox`** — block with `margin-bottom: 25px`, no padding.
- **`.ibox-title`** — white, **3px top accent border** in `@border-color`, padding
  `14px 15px 7px`, `min-height: 48px`. Holds an `h5` title (optionally with a `<small>` muted
  subtitle) and right-aligned tools/buttons.
- **`.ibox-content`** — white, `15px 20px 20px`, 1px top/bottom borders.
- **`.ibox-footer`** — white, top border, 90% font; commonly hosts table action buttons.
- **`.ibox-heading`** — variant with `@light-blue` (`#f3f6fb`) background and a thin `h3`.
- **`.ibox-tools`** — right-aligned action area (collapse / close / dropdown), links `#c4c4c4`.
- States: `.ibox.collapsed` (hides content, flips chevron), `.ibox.fullscreen`.

Colored panel headers also exist via Bootstrap: `.panel-primary/-success/-info/-warning/-danger`
take the matching semantic color.

### 5.2 Buttons

From [buttons.import.less](../src/app/client/stylesheets/globals/buttons.import.less).
Base `.btn` is **bold** (`clinica-facil.css`) with 3px radius.

| Class | Fill | Text |
|-------|------|------|
| `.btn-primary` | `@navy` green | white |
| `.btn-success` | `@blue` | white |
| `.btn-info` | `@lazur` | white |
| `.btn-warning` | `@yellow` | white |
| `.btn-danger` | `@red` | white |
| `.btn-default` / `.btn-white` | white | inherit, 1px `@border-color` |
| `.btn-link` | transparent | inherit → `@navy` on hover |

- **Hover/active:** background & border `darken(color, 3%)`; disabled `lighten(color, 4%)`.
- **Variants:** `.btn-outline` (transparent fill, colored text → fills on hover),
  `.btn-rounded` (pill), `.btn-w-m` (min-width 120px), `.btn-large-dim` / `button.dim`
  (chunky 3D shadow buttons), Bootstrap sizes `.btn-sm` / `.btn-lg`.
- **Convention:** primary actions use `.btn-primary` with a leading Font Awesome icon, e.g.
  `<button class="btn btn-sm btn-primary"><i class="fa fa-plus"></i> Novo</button>`.
- `.btn:focus` removes the outline.

### 5.3 Labels & badges

From [badgets_labels.import.less](../src/app/client/stylesheets/globals/badgets_labels.import.less).

- **`.label`** — 10px, weight 600, padding `3px 8px`; default `@light-gray` bg / `#5E5E5E` text.
- **`.badge`** — 11px, weight 600, rounded pill.
- Semantic modifiers: `-primary` (`@navy`), `-success` (`@blue`), `-warning` (`@yellow`),
  `-danger` (`@red`), `-info` (`@lazur`), `-inverse` (`#262626`), `-white`.
- **`.simple_tag`** — small chip: `#f3f3f4` bg, 1px border, 2px radius, 10px text.

### 5.4 Tables (DataTables)

- Built on jQuery **DataTables** via the `ReactiveDatatable` template, rendered inside
  `.ibox-content`, with a paired `#table-footer.ibox-footer` for bulk actions.
- `.table` cells: 8px padding, 1px `@border-color` top border, top-aligned.
- `.table-bordered` headers: `#F5F5F6` fill, `#e7e7e7` borders.
- **Row hover** (`clinica-facil.css`): background `#E0F2F1` (pale teal) + pointer cursor —
  rows are clickable.
- Action buttons inside tables get tight 3px padding (`table.dataTable a.btn`).

### 5.5 Forms

- Bootstrap 3 `.form-control` / `.form-group` / `.control-label`, with shadows removed
  (flat appearance).
- Schema-driven forms via **autoform** + simple-schema (`{{> quickForm}}` / `afFieldInput`).
- Enhanced inputs from vendored plugins: **chosen** (multi-select, selected tags in brand
  green), **clockpicker**, **iCheck**, **switchery** toggles, **summernote** rich text,
  **formBuilder** for dynamic form models.
- Account screens use **useraccounts** `{{> atForm}}`; the submit button is overridden to the
  brand green (`#at-btn` → `#1ab394`, see `login.css`).

### 5.6 Navigation — sidebar

From [navigation.import.less](../src/app/client/stylesheets/globals/navigation.import.less)
and [navigation.html](../src/app/client/views/common/navigation.html).

- Dark rail (`@nav-bg` `#2F4050`), links `@nav-text-color` (`#a7b1c2`), weight 600,
  padding `14px 20px 14px 25px`; hover = `darken(@nav-bg, 3%)` + white text.
- Top item is a **profile element**: circular avatar, user first name (bold) + translated
  role group (muted), with a dropdown.
- Menu items are **role-gated** (`{{#if isInRole '...'}}`) — Dashboard, Schedule, Patients,
  Reports, Settings (with nested `nav-second-level` submenus).
- Each item: Font Awesome icon (colored `#36C1FF`) + `.nav-label`; submenus expand with the
  `.fa.arrow` caret. Active state via `{{isActivePath}}`.
- Collapsed (`mini-navbar`) state shows the `CF` `.logo-element`.

### 5.7 Dropdown menus

- 3px radius, soft shadow `0 0 3px rgba(86,96,117,0.7)`, 12px text, no border.
- Items: 4px margin, 25px line-height, normal weight; **active item** uses `@navy` bg / white.
- Often animated with `animated fadeInRight`.

### 5.8 Modals

- `.modal-content`: white, 4px radius, shadow `0 1px 3px rgba(0,0,0,0.3)`.
- `.modal-body`: `20px 30px 30px`; `.inmodal` body fill `#f8fafb`, centered header,
  big 84px `.modal-icon`, 26px `.modal-title`.
- z-index stack: backdrop `2040`, modal `2050`.

### 5.9 Alerts & notifications

- **SweetAlert** (`clinica-facil.css` + `sweetalert.css`): 4px radius dialogs; buttons styled
  like Bootstrap btns; warning icon uses `@red` (`#ED5565`).
- **Toastr** for transient toasts (`toastr.min.css`).
- **qTip** tooltips (`jquery.qtip.css`).

### 5.10 Progress bars

`.progress-bar` defaults to `@navy`; semantic variants `-success/-info/-warning/-danger`
plus `.progress-bar-navy-light` (`#3dc7ab`). Thin sizes: `.progress-small` (10px),
`.progress-mini` (5px).

### 5.11 Login / public screens

Public pages use the `blank` layout (no sidebar). The login screen
([login.html](../src/app/client/views/templates/login/login.html)) centers a
`.middle-box .loginscreen` card with the `Clínica Fácil` logo (`h1`), a welcome heading, the
`atForm`, and a footer credit line — entering with `animated fadeInDown`.

---

## 6. Iconography

- **Font Awesome 4** (imported via `style.less` from node_modules) is the icon set throughout.
- Common icons: `fa-dashboard`, `fa-calendar`, `fa-male`/`fa-female` (patients),
  `fa-user-md` (doctors), `fa-stethoscope` (specialties), `fa-cogs` (settings),
  `fa-plus` (create), `fa-file-text` (documents), `fa-database` (import).
- Sidebar icons are tinted `#36C1FF`; inline button icons inherit the button text color.
- A few custom raster icons live under `/images/` (e.g. `drugs.png`).

---

## 7. Motion

- **animate.css** (`stylesheets/animatecss/animate.css`) drives page and element transitions.
- Conventions: content pages `fadeInRight`, dropdowns `fadeInRight`, login `fadeInDown`.
- `.btn-outline` transitions color over `0.5s`. Animations are disabled in fullscreen-ibox
  and fullscreen-video modes.

---

## 8. Iconset of files (where to change what)

| Concern | File |
|---------|------|
| Color & layout tokens | `stylesheets/globals/variables.import.less` |
| Heading sizes/weights | `stylesheets/globals/typography.import.less` |
| Spacing/utility classes, ibox, tables, backgrounds | `stylesheets/globals/base.import.less` |
| Buttons | `stylesheets/globals/buttons.import.less` |
| Labels & badges | `stylesheets/globals/badgets_labels.import.less` |
| Sidebar / nav | `stylesheets/globals/navigation.import.less`, `sidebar.import.less` |
| Compile order / font import | `stylesheets/style.less` |
| Project overrides (brand-green tweaks, row hover) | `stylesheets/clinica-facil.css` |
| Per-feature tweaks | `views/templates/<feature>/.../<feature>.css` |
| Theme skins (alternative palettes) | `stylesheets/globals/skins.import.less`, `md-skin.import.less` |

---

## 9. Quick reference — design tokens

```less
// Brand / semantic
@navy:   #1ab394;  // PRIMARY (green)
@blue:   #1c84c6;  // success
@lazur:  #23c6c8;  // info
@yellow: #f8ac59;  // warning
@red:    #ED5565;  // danger

// Neutrals
@text-color:  #676a6c;  // body text
@gray:        #f3f3f4;  // content bg
@light-gray:  #D1DADE;  // label bg
@light-blue:  #f3f6fb;  // subtle panel bg
@border-color:#e7eaec;  // borders/dividers

// Navigation (dark)
@nav-bg:         #2F4050;
@nav-text-color: #a7b1c2;

// Metrics
@sidebar-width: 220px;   // content offset 240px
@boxed-width:   1200px;
@btn-border-radius: 3px; // cards/modals 4px

// Type
font-family: "Open Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
font-size: 13px;         // body
// h1 30 · h2 24 · h3 16 · h4 14 · h5 12 · h6 10  (h1/h2/h6 weight 100, h3–h5 weight 600)
```

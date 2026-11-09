# Detonato — guide for contributors and agents

A pomodoro app for a fixed daily routine. Tasks repeat every day or on chosen
weekdays, and each task is a number of sessions of a set length. A segment
display counts each session down, and a GitHub-style graph shows how much of
each day got done.

The look was first settled in `mockup/`, a single HTML page. Where the mockup
and the app disagree, **the app wins**.

## Workspace

This is a pnpm workspace with one lockfile at the root.

- `app/` holds the app: the web build, and its iOS and Android shells
  (`app/ios`, `app/android`). Everything below is about it, and its paths
  are under `app/`, except **Landing page**.
- `landing/` holds the landing page: a static Astro site (Tailwind v4,
  TypeScript). See **Landing page** at the end.
- `mockup/` holds the approved mockup. Leave it alone; it's a record.
- `segment-designs.svg` is Posy's sheet, the source of every display
  design.

The root's `pnpm dev`, `test`, `e2e`, `lint`, `glyphs` and `icons` run the
app's; `pnpm landing` runs the landing page's dev server; `pnpm build`
builds both. `pnpm-workspace.yaml › allowBuilds` names the install scripts
pnpm may run (esbuild's, for Astro).

The app opens on Today (`/`): the day's tasks, its sessions done so far,
and a quick session. History (`/history`), Tasks (`/tasks`), the timer
(`/timer`) and Settings (`/settings`) push over it, and there's no tab bar.

## Commands

Run these from `app/` or the root:

```sh
pnpm dev     # Vite dev server on port 5190; /dev/glyphs shows 0–9 in every design
pnpm test    # vitest (in America/New_York, so day math always meets DST)
pnpm e2e     # Playwright on the system Chrome, against a test build of its own (port 5293)
pnpm lint    # oxlint
pnpm build   # tsc -b + vite build
pnpm glyphs  # regenerate src/core/segments/glyphs.json from the sheet (needs Inkscape)
pnpm sounds  # render the notification's WAVs from src/core/sounds.ts into public/ and android/…/res/raw/
pnpm icons   # draw the icon and splash (scripts/icons.ts), render assets/*.png (Inkscape), write every size into ios/ and android/
pnpm downloads  # the signed release APK and an unsigned IPA, into release/, for a GitHub release (scripts/downloads.sh)
pnpm exec cap sync   # after `pnpm build`: copy dist/ and the plugins into both native projects
```

Run test, e2e, lint and build before calling work done.

**e2e/** holds the regression suite, one test per behaviour it protects. A
fixed bug gets a test there, or a unit test when it can't be reached from the
UI, before it's called fixed.

**Native shells.** These are Capacitor 8 projects, with appId
`xyz.wintercore.detonato`.
- **Build:** `pnpm build && pnpm exec cap sync`, then:
  - Android: `cd android && ./gradlew assembleDebug`. Gradle needs JDK 21
    (newer ones fail); Android Studio's bundled one works:
    `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`.
  - iOS: open `ios/App/App.xcodeproj` in Xcode. It uses Swift Package
    Manager; there's no CocoaPods.
- **Releases.** The app isn't on either store: the files are on the
  repository's GitHub releases, and the web build runs at
  detonato-app.wintercore.xyz.
  - `pnpm downloads` builds a release APK and an unsigned Release IPA into
    `release/` (gitignored), always as `detonato.apk` and `detonato.ipa`.
    The IPA is for AltStore, SideStore or Sideloadly, which re-sign it with
    the installer's own Apple ID.
  - **Publishing:** raise the versions (below), commit, and push; then
    `gh release create v<version> --title "Detonato <version>" --notes-file
    <notes> release/detonato.apk release/detonato.ipa`. Keep those names: the
    landing page and the README link to
    `releases/latest/download/detonato.apk` (and `.ipa`), which GitHub sends
    to the newest release's file, so the links never change.
  - **Signing:** release builds sign with the key that
    `android/keystore.properties` names (gitignored: `storeFile`,
    `storePassword`, `keyAlias`, `keyPassword`). The key lives outside the
    repo. Without the file, release builds come out unsigned. Every update
    must be signed with the same key, or Android refuses to install it over
    the old one: back the key and its password up.
  - **Versions:** keep `package.json › version`, Android's `versionName`
    and iOS's `MARKETING_VERSION` (in both targets, App and
    SessionActivity) in step, and raise Android's `versionCode` by one for
    each release, or the APK won't update.
- **Debugging:** a debug build's WebView can be debugged from
  `chrome://inspect`, or driven with Playwright's `connectOverCDP` after
  `adb forward tcp:9223 localabstract:webview_devtools_remote_<pid>`. That
  is how the notification was tested end to end on the emulator.
- **Hand edits to the native projects** (keep them when re-adding a
  platform):
  - `AndroidManifest.xml`: `USE_EXACT_ALARM`, plus `SCHEDULE_EXACT_ALARM`
    capped at API 32, so a session's end arrives on time. Google Play allows
    `USE_EXACT_ALARM` for apps whose core is a timer; say so when
    submitting.
  - `AndroidManifest.xml`: `RECEIVE_BOOT_COMPLETED` and
    `session.SessionReceiver`, the countdown's buttons, the end's alarm and
    the reboot (see **Notifications**).
  - `java/…/detonato/session/`: the app's own plugin, SessionNotice, and
    `MainActivity` registering it; `res/layout/notification_session.xml`,
    the countdown's layout.
  - `res/drawable/ic_stat_detonato.xml`: the status-bar icon.
  - `res/raw/session_*.wav`: written by `pnpm sounds`.
  - `res/values/styles.xml`: `windowSplashScreenBackground` on the launch
    theme, so Android 12+'s own launch screen is the app's ground, not
    white; `ic_launcher_background` is the same #0B0C0D.
  - `capacitor.config.ts › backgroundColor`: the ground behind the web
    view, so the first frame is never white.
  - iOS: the `SessionActivity` widget extension target (the Live
    Activity), embedded in App; `App/Session*.swift`, SessionNotice and its
    shared types (`SessionAttributes`, `SessionIntents` are in both
    targets; the widget's build defines `WIDGET_EXTENSION`);
    `MainViewController`, which registers the plugin, as the scene's root
    and in Main.storyboard; Info.plist's `NSSupportsLiveActivities` and the
    `detonato` URL scheme. The app still runs on iOS 15, so it weak-links
    ActivityKit and AppIntents (`OTHER_LDFLAGS`).
- **App icon and splash:** a countdown dial, three quarters lit, with «25»
  in Sports segments, on the app's ground. `pnpm icons` draws it
  (`scripts/icons.ts`), renders the sources in `assets/`, and runs
  `@capacitor/assets` for both platforms; it also writes `public/favicon.svg`.
  The generator reformats `AndroidManifest.xml` and
  `AppIcon.appiconset/Contents.json` without changing them: discard those
  diffs.

## Folder structure

```
src/
  core/          the rules as plain functions: no React, no IO, a test beside each file
    types.ts       the data model (read its comments first)
    tasks.ts       a task's plan on a day, what's scheduled, and making, changing and deleting tasks
    progress.ts    a day's sessions done of its total, its shade, the streak, minutes of focus
    history.ts     over many days: the best streak, perfect days, focus, each task's rate
    settings.ts    every setting: values, defaults, and reading them back from anything
    timer.ts       the session timer: its states and the moves between them, in epoch ms; what it logs
    notice.ts      what the end-of-session notification says
    sounds.ts      the end-of-session sounds as notes; their files; Android's channel for each
    backup.ts      the backup file: making one, reading one
    segments/      the display designs (glyphs.json, generated), which segments light, names and families
    time/          calendar days (`DayKey`)
  state/         all app state: one Zustand store and every action that changes it (see State)
  storage/       what's kept on the device: tasks and sessions in IndexedDB; settings and the session
                 under way in localStorage
  navigation/    back, sheets in the history, and scrolling each screen to its top
  screens/<feature>/
    views/         components that render, nothing else
    hooks/         glue: which sheet is open, what a tap calls, DOM effects
    lib/           the feature's pure logic and view builders (+ tests)
  components/    components shared by several features that ui/ can't hold, because they read the store
                 or run effects (Toaster)
    segments/      the segment display: Display, Digit, Mark
  ui/            logic-free rendering primitives
  lib/           small helpers shared by several features, never components (applyDisplay, clock,
                 session, sessionNotice, startSession, notifications, keepAwake, haptics, sound,
                 useSecondsLeft, weekDays, links)
  styles/        tokens.css holds the raw values; theme.css holds fonts, scales and the token mapping
  dev/           dev-only pages
```

**Placing a file:**
- Used by one feature: it goes in that feature's folder.
- A pure rule used by several: `core/`.
- A component used by several: `ui/` if it's a logic-free primitive, otherwise `components/`.
- Any other UI-side helper used by several: `lib/`.

Never add a catch-all folder.

## Code rules

- **`core/` is pure.** Data in, answers out, with a test beside every file.
  It imports nothing outside `core/`.
- **Views only render.** When a component starts assembling data or holding
  save or error state, that work moves into a hook or `lib/`.
- **Nothing derived is stored.**
- **Days are `DayKey` strings** (`yyyy-mm-dd`, local time). Use
  `core/time/calendar`.
- TypeScript is strict. Name ids with their aliases (`StyleId`, `DayKey`),
  not bare `string`.
- **Imports:**
  - `@/` is `src/`. Never climb with `../`; only same-folder imports stay
    relative.
  - Order: packages, then `@/`, then `./`.
- **No ternaries.** Prefer an early return. When a value inside a function
  needs a branch, break it out into a small inline function that returns
  early. Otherwise use `if`/`else`, a lookup table or a `switch`. In JSX,
  return early or use `{cond && …}`. (Older code still has some; new code
  adds none.)
- **Every `if` and loop body goes in braces,** even a one-line `return` or
  `continue`.
- **Don't repeat markup.** A second copy of a pattern becomes a `ui/`
  primitive.
- **An effect returns only its cleanup.** Write effect bodies as blocks: in
  Chrome, `window.scrollTo` returns a promise, and an arrow that returned it
  crashed the app.

## State

All app state lives in one Zustand store in `src/state/`. `state/index.ts`
maps its files, and screens import from `@/state` only (lint enforces it).

- **Read with `useApp(select)`.** A selector returns something already in
  the store, never a new object.
- **Change state only through `@/state`'s actions.** In DevTools each one is
  named `settings/led`, `app/boot` and so on.
- **Boot:** `main.tsx` awaits `boot()` before the first render, so nothing
  flashes. It opens IndexedDB and loads the tasks and sessions, reads the
  settings and the session under way from localStorage, replays the moves
  made on the notification while the app was closed, and only then settles
  a session that ended meanwhile. If the database won't open,
  the app shows a line saying so instead.
- **Tasks and sessions** (`state/tasks.ts`, `storage/`):
  - They live in IndexedDB (`storage/db.ts`: stores `tasks`, and
    `sessions` indexed by `day`), through a connection that reopens itself
    when the phone drops it (`storage/connection.ts`).
  - The store holds them all as `snap`; `state/writes.ts › serial` runs
    every write one at a time, and each **persists first, then sets the
    store**. A failed save leaves the store as it was, and toasts.
  - A task keeps every plan it has had (`TaskPlan.from`). An edit adds a
    plan from today (or replaces today's), and a delete sets `deletedOn`,
    so a past day is always judged by the plan it had then.
  - A day's fill is Σ min(done, N) / Σ N over the tasks scheduled that day
    (`core/progress`). Nothing derived is stored; it's counted from the
    sessions each time.
  - `today` is in the store, moved on at midnight and when the app comes
    back (`lib/clock.ts › followDay`).
- **Settings:**
  - Read from localStorage (`storage/settings.ts`, key
    `detonato.settings`).
  - Each action writes first, then updates the store.
  - Writes are best effort: if the device won't save, the change still holds
    for the run, and one toast says so.
  - `core/settings.ts › parseSettings` reads each field on its own. A bad
    value takes its default alone, and unknown keys are dropped.
  - A field added needs no version bump. A field that changes meaning bumps
    `SETTINGS_VERSION`, and `parseSettings` then reads the old shape.
- **The timer:**
  - `core/timer.ts` holds the states (idle, running, paused, done) and pure
    moves between them. Times are epoch milliseconds: a running session
    stores when it ends, not a count, so it survives a reload or the app
    being killed.
  - A session carries its `taskId` (null for a quick session) and the `day`
    it started, which is the day it counts for, even past midnight.
  - `state/timer.ts` saves each move (`storage/timer.ts`, key
    `detonato.timer`), then sets the store.
  - **Logging:** a task's session that ends puts its `SessionRecord` first,
    then saves the timer as done. The record's id is `taskId@endedAt`, so
    writing it twice is harmless, and a crash between the two steps never
    logs a session twice. Quick sessions log nothing.
  - `boot()` settles a session that ended while the app was closed: it's
    logged, and opens done, ended when it was due.
  - Every session starts through `lib/startSession.ts › beginSession`,
    from the tap: it wakes the audio and asks to notify first.
  - One session at a time: while one is under way, every other play button
    is disabled.
- **Side effects follow the store.** `lib/session.ts › followSession` keeps
  every effect of a session in step, whatever screen is open:
  - the end, on time;
  - the session on the phone (`lib/sessionNotice`): its countdown while it
    runs or is held, with the end's alert handed over while it runs; the
    countdown put away when it's done, and the alert taken back too when
    it's stopped;
  - the moves made on that countdown, taken and replayed before any end is
    settled (when the end comes, the app comes back, or a move tells it);
  - keep-awake;
  - the sound and buzz when the end comes with the app in front. Just
    before the end, an app in front takes the alert back so the phone
    doesn't ring too, and hands it over again if the app leaves in those
    last 1.5 s.

  `lib/applyDisplay › followDisplay` does the same for the LED settings.
- **Local UI state stays local** (which sheet is open) as `useState` in the
  screen's hook.
- **Sheets live in the history.** `navigation/sheet.ts › useSheetEntry`
  pushes `#name` while a sheet is open, so back (the browser's, or
  Android's, which `navigation/back › followBackButton` sends through the
  history, leaving the app when there's none) closes the sheet instead of
  leaving the screen. Escape closes it too. Every sheet uses it.
- **Screens leave by going back** (`navigation/back › useBack`, and
  `useLeaveWhen` for a screen whose subject is gone, like the timer with no
  session), never by navigating on to `/`: each new entry for Today costs
  one more back press before Android's back leaves the app.

## The segment display

- **The designs.** Every design comes from Posy's sheet. `pnpm glyphs`
  (`scripts/extract_glyphs.py`) splits the sheet into designs and segments
  and works out which segments make each digit.
  - A segment's index is its order in the sheet, so **never reorder shapes
    in the sheet**.
  - 14 designs the geometry can't map are drawn by hand in the script
    (`HAND`, `HAND_DIGITS`, and No Compromise's grid). Check any change on
    `/dev/glyphs`. A design left without a map lights every segment.
  - Some designs can't tell every digit apart (0 and 8 without a middle
    bar; more in 4 Segments). The picker says so, from the maps.
- **Per-segment control.** Each digit is two stacked SVGs: a ghost layer,
  then a lit layer where each segment is its own `<g data-seg>` switched by
  `.on`. Animations work on single segments: the fade and the sweep.
- **The LED.** `lib/applyDisplay` puts the settings on `<html>` as `--led`,
  `--ghost` and `.glow`. Every LED shade in tokens.css (`led-ghost`,
  `lvl-0…4`, `led-fill`, …) is mixed from them.
- **Licence.** Posy's sheet is free for non-commercial use only. Shipping
  the app commercially needs his permission (michieldb.nl). Settings credits
  him.

## Notifications

- **Platforms:** the apps only. A web page can't wake itself, so Settings
  hides the row on the web.
- **Permission:** asked on the first Start, or when the row is switched on.
  A refusal turns the setting off, and Settings then shows a notice that
  opens the phone's settings.
- **One switch** in Settings, «Notifications», covers both of a session's
  notifications.
- **The countdown,** while a session runs or is held: the task and its
  session (`core/notice.ts › countdownNotice`), the time left, and Pause or
  Resume, and Stop. The phone draws the clock, so nothing in the app has
  to run for it.
  - Android: an ongoing notification, id 2, on a channel with no sound,
    «Session under way». At the end it gives way to the end's alert, and
    Stop removes it. The user can still swipe it away.
  - iOS: a Live Activity, on the lock screen and in the Dynamic Island,
    from iOS 16.2; its buttons need iOS 17. It can't end itself: at the end
    it goes stale and reads «Session done» until the app opens and ends it.
- **The end's alert**, id 1, because there's one session at a time. It
  reads «Deep work» / «Session 2 of 3 done · 50 minutes» for a task, or
  «Session done» for a quick session (`core/notice.ts › endNotice`).
- **Both belong to SessionNotice**, the app's own native plugin
  (`lib/sessionNotice.ts`; `android/…/detonato/session/`;
  `ios/App/App/Session*.swift` and `ios/App/SessionActivity/`). The local
  notifications plugin still asks permission, makes Android's sound
  channels, and reports iOS taps on the alert.
  - **The buttons work with the app closed.** A tap moves the native copy
    of the session with the app's rules, shows it, cancels or re-sets the
    alert (Android: an exact alarm; iOS: a pending request), and queues the
    move with its time. The app takes the queue (`takeCommands`) and
    replays it (`core/timer › replay`), at boot before settling, so a
    session paused there before its end opens paused, not done. A running
    app is told at once (`commands`).
  - Android sets the alarm and the countdown again after a reboot
    (`SessionReceiver`).
- **Sound:**
  - Android: a channel's sound and vibration are fixed once it exists, so
    each sound and haptics pair gets its own channel (`core/sounds.ts ›
    endChannel`). Only the channel in use is kept.
  - iOS: the alert plays the WAV from the web assets (`public/`), so no
    Xcode resources are needed.
- **Tapping either** opens `/timer`: both open `detonato://timer`, which
  `@capacitor/app` reports (`lib/notifications › onNoticeTapped`).

## Design guidelines

**Tokens only.** `styles/theme.css` clears Tailwind's stock palette, sizes,
radii, shadows and fonts, so `bg-red-500` or `text-lg` compile to nothing.
- **Colour:**
  - The hardware: `bg`, `window`, `panel`, `raised`, `line`, `edge`.
  - Ink: `ink`, `ink-2`, `ink-3` (1 is the strongest).
  - The LED: `led`, `led-ghost`, `led-fill`, `led-track`, `lvl-0…4`, and `on-led` for ink on a lit fill.
- **Type:** `micro caption meta small body lead title`. `eyebrow` is a
  section label.
- **Radius:** `xs` to `2xl`, plus `sheet` and `full`.
- **Shadow:** `led window chip-on pressed selected sheet`.
- **Press:** `press` for buttons and chips, `press-wide` for full-width
  rows.

A new token goes in tokens.css, in theme.css's `@theme inline` mapping, and
in `ui/cn.ts` if it's a size, radius or shadow name.

Rules:

- **One theme: dark hardware.** The app never follows the phone's light or
  dark mode.
- **The glow is a blur, by choice.** Blur filters cost phones frames, so
  the app keeps exactly one: the LED glow is a CSS
  `drop-shadow` on the lit layer (`components/segments/segments.css`), only
  under `.glow`, and it can be switched off in Settings. Don't add blur
  anywhere else.
- **Everything tappable presses**, using one of the `press` utilities. No
  text is selectable and the page never zooms.
- **Fonts** are self-hosted through Fontsource: `font-ui` (IBM Plex Sans) for
  the interface and `font-mono` (IBM Plex Mono) for labels and readouts.
- **Icons** are Phosphor, via `@phosphor-icons/react`, using the `*Icon`
  names.
- **Text** is English, written left to right.
- **Layout:** design at phone width, in the app's column (`max-w-app`,
  centred). Respect `env(safe-area-inset-*)`; the top bar carries the top
  inset.
- **`ui/` primitives are dead simple:** props in, markup out, with no state,
  no effects and no `core/` calls. Extra classes go through `className` via
  `cn()`.

## Landing page

`landing/`, the package `@detonato/landing`: one static page, built with
Astro 6 (Astro 7 needs Node 22.23 or newer), Tailwind v4
through `@tailwindcss/vite` and TypeScript.

```sh
pnpm landing                              # from the root: dev server on port 5191
pnpm --filter @detonato/landing build     # astro check, then the static site in landing/dist
```

- **One look with the app.** It reads the app's own files rather than
  copying them: `app/src/styles/tokens.css` (the colours),
  `app/src/components/segments/segments.css` (the display, its sweep and
  glow) and `app/src/core/segments/glyphs.json` (the designs, at build time
  only, so just the drawn ones reach the page).
- **Vite:** Astro 6 runs on Vite 7 and the app on Vite 8, so the landing
  page pins its own `vite@7`; without it `@tailwindcss/vite` links to the
  app's Vite 8 and the build fails.
- **Motion** is CSS plus two small scripts (`src/scripts/`): the hero's
  countdown and the map filling in view. All of it stands still for
  `prefers-reduced-motion`.
- **Downloads:** the hero links to the APK and IPA on the latest GitHub
  release (`src/lib/downloads.ts`, see **Releases**) and to the web app.
  The site itself lives at detonato.wintercore.xyz (`astro.config.mjs ›
  site`).
- The app's code rules apply: no ternaries, braces on every `if` and loop.

## Hosting

Both websites ship as one Docker image (`Dockerfile`, `nginx.conf`), built
from the repository root:

- **8080:** the landing page, at detonato.wintercore.xyz.
- **8081:** the web app, at detonato-app.wintercore.xyz. Any path that isn't a
  file falls back to `index.html`, so a screen's URL opens it.
- Hashed build files (`/_astro/`, `/assets/`) are cached for a year; the pages
  themselves are never cached, so a deploy shows at once.
- **Dokploy:** one Application, build type Dockerfile, Dockerfile path
  `Dockerfile`, context `.`. Add two domains, one per site, each with its
  container port and HTTPS. Traefik routes them, so no host ports need
  publishing.
- `.dockerignore` keeps the native projects, `node_modules` and build output
  out of the build.

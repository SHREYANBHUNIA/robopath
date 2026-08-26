# RoboPath — Design Direction

## Three visual approaches

| Theme Name | Very Brief Intro | Probability |
| --- | --- | --- |
| Kinetic Cartography | A crisp technical workspace inspired by survey maps and field instruments, emphasizing routes, terrain, and traceable decision-making. | 0.07 |
| Mission Control Paper | A warm editorial-control-room aesthetic pairing utilitarian panels with analog documentation cues. | 0.04 |
| Vector Field Lab | A dark, high-contrast simulation bench built around an electric route-line system and responsive navigation telemetry. | 0.09 |

## Selected approach — Kinetic Cartography

### Design Movement

**Swiss cartographic modernism translated into an active robotics instrument.** The interface borrows the precision, alignment, annotation language, and controlled restraint of engineering maps rather than a generic SaaS dashboard.

### Core Principles

1. Make the simulation field the visual protagonist; controls should orbit the work, never compete with it.
2. Treat every route, obstacle, and scan as evidence with a purposeful visual grammar.
3. Create depth using paper-white planes, graphite surfaces, and fine rule lines rather than large rounded-card collections.
4. Make realtime changes legible through motion trails, signal pulses, and quiet state transitions.

### Color Philosophy

The environment uses **bone white** and **warm graphite** to feel like a technical field notebook. A saturated **signal orange** is reserved for the robot and decisions that require attention, while **deep cobalt** identifies planned paths and **luminous mint** confirms sensor awareness. These accents carry semantic meaning rather than decorative color.

### Layout Paradigm

The page is a wide field station. A single upper command rail spans the page; the central terrain occupies a weighted canvas, with a narrow right-hand route dossier and a slim lower measurement strip. This is an asymmetric workbench, not a left-nav dashboard.

### Signature Elements

1. A coordinate-grid world with thin cartographic rules, labeled axes, and a subtle paper grain.
2. The robo-agent as an orange locator puck with a scanning halo and numerical mission tag.
3. A route language of cobalt segments, exploratory dots, and amber incident markers.

### Interaction Philosophy

Every interaction should feel instrument-like: a precise click places a barrier, a press runs the route, a toggle changes a world condition. Immediate visual feedback is preferred over popovers. State is reflected in the world itself.

### Animation

At first render, the field annotations and modules settle upward by 6px over 220ms with a crisp ease-out. A route draws forward in discrete segments, the robot advances one cell at a time, and dynamic obstacles arrive with a short amber radial pulse. All nonessential animation switches off under `prefers-reduced-motion`.

### Typography System

**Space Grotesk** provides the terse navigation/control vocabulary and bold algorithm labels. **IBM Plex Mono** communicates coordinates, metrics, system states, and code-like details. Headings are compact and assertive; body text stays restrained; all live operational values use tabular figures.

### Brand Essence

**RoboPath is the hands-on route laboratory for engineers who need to see autonomous decisions take shape in real time.** Personality: **precise, kinetic, intelligent**.

### Brand Voice

Headlines are declarative and spatial; CTAs read as system commands; microcopy reports an observable fact rather than selling the product.

> “Routes change. The mission holds.”

> “Inject obstacle — observe response.”

### Wordmark & Logo

The mark is a compact compass-ring built from four navigation brackets around an offset central dot, conveying localization and direction without any text. The RoboPath wordmark is set in a wide, custom-feeling Space Grotesk configuration with a deliberate notch between “Robo” and “Path.”

### Signature Brand Color

**Signal Orange — `#FF5A1F`** is reserved for robot identity, active commands, and newly detected changes.

## Style Decisions

- Avoid generic left-hand navigation rails and oversized SaaS cards.
- Favor squared or minimally rounded panels, fine dividers, and field-document annotations.
- Keep visual emphasis on the active simulation world and route behavior rather than data decoration.

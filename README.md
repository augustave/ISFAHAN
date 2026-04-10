# ISFAHAN — ANI-A1 Thermal Drone HUD

A zero-dependency, SVG-based military drone surveillance HUD rendered entirely in the browser. Toggle between red thermal (FLIR) and green night vision (NVG) with a single keypress.

**[Live Demo](https://augustave.github.io/ISFAHAN/)**

![ANI-A1 HUD](https://img.shields.io/badge/status-OPERATIONAL-red?style=flat-square) ![Lines](https://img.shields.io/badge/~640_lines-zero_deps-black?style=flat-square) ![Modes](https://img.shields.io/badge/FLIR_%7C_NVG-dual_mode-green?style=flat-square)

---

## Philosophy

This project draws from Jose N. Vasquez's paper *"Seeing Green: Visual Technology, Virtual Reality, and the Experience of War"* (Social Analysis, 2008), which examines how night vision, thermal imaging, and virtual reality have reshaped the phenomenology of combat — for both operators and spectators.

Vasquez argues that visual technology simultaneously makes war more intimate and more distant. The green phosphor glow of NVGs, the red heat signatures of FLIR cameras, the crosshairs of a targeting system — these are not neutral frames. They are designed perspectives that flatten human subjects into silhouettes, heat signatures, and target coordinates. The HUD is the interface through which the operator sees, decides, and acts. It mediates between the human and the consequence.

ISFAHAN reconstructs this interface as a browser artifact — not to simulate warfare, but to make the mediation visible. When you toggle between FLIR and NVG, you are switching between two ways of seeing that were engineered to grant tactical advantage at night. When the reticle pulses and the "TGT LCK" indicator blinks, the interface is performing its designed function: transforming a scene into a decision space.

The project is named after Isfahan, a city whose history spans millennia of conflict and civilization — a reminder that the landscapes these systems surveil are not abstractions.

## Features

### Dual Vision Modes
- **FLIR / Thermal** (default) — red/black infrared palette, heat signature visualization
- **NVG / Night Vision** — green phosphor palette, image intensification aesthetic
- Press **N** to toggle between modes instantly

### Avionics
- **Compass bar** — heading indicator with cardinal/degree tick marks, sinusoidal drift
- **Altitude tape** — scrolling vertical instrument (left), 2000-3600 FT range
- **Airspeed tape** — scrolling vertical instrument (right), 80-180 KTS range
- **Roll/bank horizon** — tilting horizon line with aircraft W-symbol
- **Targeting reticle** — pulsing bracket system with inner/outer crosshairs

### Tactical Systems
- **Weapon status** — Hellfire missile count with fire simulation
- **RWR (Radar Warning Receiver)** — mini radar display with randomized threat bearings
- **Target lock** — TGT LCK / HT SIG indicators with live range readout
- **FLIR gimbal** — drifting zoom, pan, and tilt sensor data
- **Flight mode** — AUTO / LOITER / RTB cycling

### Telemetry
- **GPS coordinates** — drifting DMS format over Southern California
- **UTC clock** — real-time from system clock
- **System status** — SYS / TRK / WPN / LNK / FLT panels with state transitions
- **Power** — percentage readout with vertical bar gauge

### Atmosphere
- **Thermal noise grain** — SVG feTurbulence filter with animated seed (~20Hz)
- **Scanline overlay** — vertical line texture simulating low-res display
- **Vignette** — radial edge darkening
- **Background drift** — layered CSS gradients with slow positional animation
- **HUD flicker** — rapid opacity oscillation for CRT authenticity

## Controls

| Key | Action |
|-----|--------|
| **N** | Toggle FLIR (red) / NVG (green) mode |
| **Click** | Reposition targeting reticle |
| **W / S** | Altitude +/- 20 FT |
| **A / D** | Heading +/- 2 degrees |
| **Arrow Up/Down** | Altitude +/- 50 FT |
| **Arrow Left/Right** | Heading +/- 5 degrees |
| **Space** | Fire weapon (screen flash, depletes Hellfire count) |

## Technical Design

### Constraints

The entire project is three files and zero dependencies. No build step, no framework, no npm. Open `index.html` in a browser and it works. This constraint is intentional — the HUD should feel like a single self-contained instrument, not a software product.

### Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Structure | **SVG** | All vector HUD elements — reticle brackets, compass ticks, tape instruments, horizon line, RWR display. A single `viewBox="0 0 1920 1080"` coordinate space with `preserveAspectRatio="xMidYMid meet"` for responsive scaling. |
| Styling | **CSS Custom Properties** | 16 color variables on `:root` (thermal palette) overridden by `body.nvg` (NVG palette). Mode switching is a single class toggle — no JS color manipulation needed. |
| Effects | **CSS + SVG Filters** | Scanlines via `repeating-linear-gradient`, vignette via `radial-gradient`, noise grain via `feTurbulence`, glow via `feGaussianBlur` + `feMerge`, text glow via `drop-shadow` with palette-aware `var()`. |
| Animation | **CSS Keyframes** | Five palette-neutral animations: reticle pulse (scale), indicator blink (opacity), scan line sweep (translateY), HUD flicker (opacity), thermal drift (background-position). All use transform/opacity — no color keyframes needed for mode switching. |
| Logic | **Vanilla JS** | ~270 lines. One `requestAnimationFrame` loop (compass heading, bank angle, noise seed), three `setInterval` timers (1s telemetry, 2s GPS, 3s status/RWR). Tick marks built once via innerHTML, animated via SVG `transform` attribute — no per-frame DOM rebuilds. |

### Architecture

Three stacked full-viewport layers:

```
z:10  div#scanlines      Vertical line texture + radial vignette (pointer-events: none)
z:5   svg#hud            All HUD elements in 1920x1080 viewBox
z:0   div#thermal-bg     CSS gradient landscape (palette-aware via custom properties)
```

### Color System

The palette is defined as CSS custom properties, making mode switching a zero-JS operation on the rendering side:

```
:root (Thermal/FLIR)          body.nvg (Night Vision)
--hud-primary:  #ff0000       --hud-primary:  #00ff00
--hud-bright:   #ff3333       --hud-bright:   #33ff33
--hud-mid:      #cc0000       --hud-mid:      #00cc00
--hud-dim:      #990000       --hud-dim:      #009900
--hud-deep:     #660000       --hud-deep:     #006600
--hud-subtle:   #330000       --hud-subtle:   #003300
```

SVG elements use `style="stroke: var(--hud-primary)"` instead of presentation attributes, allowing CSS variable resolution to cascade through the entire HUD when the body class changes.

### Performance

- Compass ticks: built once (3x360-degree repetitions for seamless wrapping), translated per frame via `transform` attribute — no innerHTML per frame
- Tape instruments: built once, scrolled via `translateY`
- Noise grain: `feTurbulence` seed updated every 3rd frame (~20Hz) to balance visual quality and CPU
- All animations are CSS-driven (GPU-composited where possible)
- Total paint: ~640 lines of code, typically <2ms frame time on modern hardware

## Run Locally

```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

Any static file server works. No install, no build.

## References

- Vasquez, J.N. (2008). "Seeing Green: Visual Technology, Virtual Reality, and the Experience of War." *Social Analysis*, 52(2), 87-105.

## License

MIT

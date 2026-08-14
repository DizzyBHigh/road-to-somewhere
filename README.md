# DBH — On the Road to Somewhere

Streaming brand and OBS overlay system for DuhBuhHuh (DBH).

## Brand
- Signature blue: `#0384CB`
- Tagline: **On the Road to Somewhere**
- Core concept: road-trip / route / destination-unknown visual language
- Budget: $0; use free/open fonts and assets only

## OBS approach
This project is intentionally modular. Do **not** build the scenes as single flattened images.

Scene visuals are assembled in OBS from independent transparent assets and live OBS sources so they can be animated with Exeldro's Move plugins.

## Planned scenes
1. `DBH - STARTING`
2. `DBH - BRB PIT STOP`
3. `DBH - PAUSE`
4. `DBH - ENDING`
5. `DBH - NEXT STOP`
6. `DBH - TRANSITION`

## BRB special feature
The BRB scene includes a framed **CURRENT GAME** display. The frame, glow, reflection, labels and decorative elements are supplied as separate assets; the interior is a live OBS Game Capture source.

## Repository layout
See `docs/` for brand and OBS specifications, and `assets/` for production graphics.

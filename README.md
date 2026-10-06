# GraphHead

An interactive cartography of Radiohead's musical language, built as a university project for a popular-music-history course.

GraphHead rejects the usual linear discography page. Time is still the horizontal backbone, but releases, tracks, production methods, themes and outside influences form a navigable graph around it. Crucially, every interpretive connection has provenance: click an edge and the interface explains what the connection means and which source supports it.

## Stack

- Vite
- React
- TypeScript
- custom SVG graph renderer (no graph framework)
- CSS-only motion / visual system

The graph renderer is intentionally custom because chronology is not just metadata here: x-position encodes time, while y-position encodes semantic layer. A generic force-directed graph would make the project look lively while quietly destroying the information architecture, a very traditional software achievement.

## Run

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Information model

- **Release** — album-scale anchors on the timeline.
- **Track** — selected compositions that make a musical or production relation legible.
- **Method** — formal, rhythmic, timbral, harmonic or production strategies.
- **Theme** — interpretive thematic nodes supported by academic literature.
- **Influence** — external artists explicitly connected by interview evidence.
- **Relation** — a claim. Every relation stores source IDs and an explanatory note.

The prototype deliberately concentrates on four transformation points: **OK Computer**, **Kid A**, **In Rainbows**, and **A Moon Shaped Pool**. Other releases are present as connective tissue rather than pretending to offer an exhaustive history.

## Sources

The source list lives in `src/data.ts` and is also exposed inside the interface.

Core bibliography:

1. Brad Osborn — *Everything in its Right Place: Analyzing Radiohead*. Oxford University Press, 2017.
2. Marianne Tatom Letts — *Radiohead and the Resistant Concept Album: How to Disappear Completely*. Indiana University Press, 2010.
3. Dai Griffiths — *Radiohead's OK Computer*. 33⅓ / Bloomsbury, 2004.
4. Primary interviews with members of Radiohead in The Guardian / Observer, Pitchfork and NPR.
5. The Radiohead Public Library — official archive.
6. XL Recordings — official discographic metadata.

### Source protocol

Official sources establish release chronology and archive material. Academic sources support musical-analysis and interpretive claims. Interviews support process and influence claims. Archived interview transcripts are explicitly marked as archival sources. No edge should be added to the graph without at least one source ID.

## Next useful extensions

- richer song-level coverage around the four focus albums;
- relation-type toggles and a year-range scrubber;
- audio-safe analytical examples (original diagrams, no copyrighted recordings bundled);
- URL state for shareable graph views;
- keyboard navigation and accessibility pass.

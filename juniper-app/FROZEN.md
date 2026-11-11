# This app is frozen

Juniper is a web app now. See `juniper-design/DECISIONS.md` **D13**, and `juniper-web/`.

Nothing new ships from this directory. It is kept, rather than deleted, for two reasons:

1. Its `src/lib/` modules are the ancestry of the web app's — `dryness`, `watering`,
   `stats`, `cover` and `today-utils` were copied out of here byte for byte, with their
   tests. Reading the originals next to the copies is sometimes the fastest way to answer
   "was that deliberate?"
2. The git history of this directory is the project's history.

The last build cut from it is `fb957efd`, from commit `2c78382`, which expired on
2026-11-21. It was the first and only build to contain the grid, and the reason the web
pivot happened the day after it was installed.

If you are looking for something here, you probably want `juniper-web/` instead.

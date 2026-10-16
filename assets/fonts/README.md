# Locally hosted editor fonts

The following unmodified TrueType files and their SIL Open Font License files are included from the official [Google Fonts repository](https://github.com/google/fonts/tree/main/ofl). They are served by this website itself; visitors do not contact an external font service. The `Mama …` family names in CSS are local aliases and do not modify the underlying font files.

| Choice | Original source file | Local file |
| --- | --- | --- |
| Lora | ofl/lora/Lora[wght].ttf | lora/regular.ttf |
| Bree Serif | ofl/breeserif/BreeSerif-Regular.ttf | breeserif/regular.ttf |
| Atkinson | ofl/atkinsonhyperlegible/AtkinsonHyperlegible-Regular.ttf | atkinsonhyperlegible/regular.ttf |
| Roboto Mono | ofl/robotomono/RobotoMono[wght].ttf | robotomono/regular.ttf |
| Lato | ofl/lato/Lato-Regular.ttf | lato/regular.ttf |

Each directory includes its original `OFL.txt`. Keep these license files with any distribution. Georgia and system-sans remain device-font options for backward compatibility with existing drafts. The five bundled fonts provide real, distinct choices independent of installed fonts.

The browser typography tests inspect actual rendered platform/custom fonts and compare rasterized glyphs, not just selector values. If a bundled font cannot load, the editor explicitly reports fallback rendering while keeping the chosen setting.

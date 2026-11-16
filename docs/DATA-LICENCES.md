# The tide data: who provided it, and on what licence

`tides` predicts from harmonic constants that other people measured and
published. This page says whose they are and what each provider allows. It is
the statement the neaps tide-database makes station by station, gathered by
provider; a station's licence follows from its provider alone.

**To see one station's:** `tides where` in the shell, or the station panel in
the browser, names its provider and licence.

## In short

| Licence | Reference stations | What it allows |
|---|---|---|
| Public domain | 1252 | anything; these are works of the U.S. government |
| CC BY 4.0 | 4164 | any use, with the providers credited |
| CC BY-NC 4.0 | 674 | non-commercial use only, with the providers credited |

The 2,244 secondary ports are NOAA's and take their reference stations'
constants: public domain.

The code is under the Apache License 2.0. **That licence does not change the
data's.** Anyone who reuses bashnav commercially must leave out the
non-commercial stations, or get the providers' leave.

## Where the constants come from

1. **NOAA harmonic constants** (ids beginning `noaa/`): National Oceanic and
   Atmospheric Administration, United States. Public domain.
2. **TICON-4 harmonic constants** (ids beginning `ticon/`): Piccioni, G.,
   Dettmering, D., Schwatke, C., Passaro, M., Seitz, F., fitted to the GESLA-4
   sea-level records. The last part of an id is the provider of the record the
   constants were fitted to, as GESLA names it.
3. **Both by way of the neaps tide-database,**
   https://github.com/neaps/tide-database, which records each station's licence
   and notes, for the non-commercial ones, "Upstream GESLA data provider
   restricts commercial use."

## Every provider

| Provider (the end of the station id) | Reference stations | Licence |
|---|---|---|
| `NOAA (noaa/ ids)` | 1252 | public domain |
| `cmems` | 672 | CC BY-NC 4.0, non-commercial use |
| `uhslc_rq` | 658 | CC BY 4.0 |
| `usgs` | 591 | CC BY 4.0 |
| `noaa` | 575 | CC BY 4.0 |
| `crms` | 328 | CC BY 4.0 |
| `uhslc_fd` | 310 | CC BY 4.0 |
| `meds` | 304 | CC BY 4.0 |
| `wsv` | 142 | CC BY 4.0 |
| `cdwr` | 131 | CC BY 4.0 |
| `bom` | 125 | CC BY 4.0 |
| `rws_hist` | 123 | CC BY 4.0 |
| `refmar` | 106 | CC BY 4.0 |
| `jodc_jma` | 81 | CC BY 4.0 |
| `smhi` | 71 | CC BY 4.0 |
| `jodc_pahb` | 70 | CC BY 4.0 |
| `rws` | 56 | CC BY 4.0 |
| `unam` | 50 | CC BY 4.0 |
| `sfwmd` | 43 | CC BY 4.0 |
| `bodc` | 41 | CC BY 4.0 |
| `ispra` | 36 | CC BY 4.0 |
| `unam_hist` | 35 | CC BY 4.0 |
| `jodc_jcg` | 31 | CC BY 4.0 |
| `ncdem` | 26 | CC BY 4.0 |
| `jodc_giaj` | 25 | CC BY 4.0 |
| `mi_c` | 25 | CC BY 4.0 |
| `nhs` | 24 | CC BY 4.0 |
| `ttw` | 21 | CC BY 4.0 |
| `da_sat` | 18 | CC BY 4.0 |
| `hct` | 17 | CC BY 4.0 |
| `cco` | 16 | CC BY 4.0 |
| `fmi` | 14 | CC BY 4.0 |
| `cm` | 12 | CC BY 4.0 |
| `ieo` | 12 | CC BY 4.0 |
| `mi_r` | 9 | CC BY 4.0 |
| `nwfwmd` | 9 | CC BY 4.0 |
| `noc` | 7 | CC BY 4.0 |
| `bfg` | 5 | CC BY 4.0 |
| `da_idh` | 5 | CC BY 4.0 |
| `da_mm` | 3 | CC BY 4.0 |
| `dmi` | 3 | CC BY 4.0 |
| `eseas` | 3 | CC BY 4.0 |
| `gloss` | 2 | CC BY 4.0 |
| `cv` | 1 | CC BY-NC 4.0, non-commercial use |
| `icg` | 1 | CC BY 4.0 |
| `uz` | 1 | CC BY-NC 4.0, non-commercial use |

`ticon/...-noaa` stations are NOAA gauges whose constants are TICON-4's fit,
not NOAA's own, and carry TICON-4's licence.

## How this is kept true

The counts above are made from `src/tides/stations.dat`. The engine's
`data_licence()` reads a station's licence off its id by the same rule, and
`docs/web/tests/tides-zero.js` holds the browser to the shell at all 8,334
stations. When the station file is next remade from its source, this page is
remade with it, and the rule is checked against the source's own statements.

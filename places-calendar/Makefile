PY ?= python3

.PHONY: install test build quick check serve osm prune clean

install:          ## install Python dependencies
	$(PY) -m pip install -r requirements.txt

test:             ## festival dates vs official calendars, unit conversions
	$(PY) tests/test_dates.py
	$(PY) tests/test_units.py

build: test       ## full build: current BS year to 2100, all sections, social cards
	$(PY) -m generator.build --clean

quick:            ## next three years, no images — for template work
	$(PY) -m generator.build --years 2083-2085 --no-images

check:            ## links, JSON-LD, hreflang, titles
	$(PY) tests/check_build.py build

serve:            ## preview at http://localhost:8000/places/
	cd build && $(PY) -m http.server 8000

osm:              ## import all temples, gumbas, mosques, churches and peaks from OpenStreetMap
	$(PY) tools/osm_import.py

prune:            ## demand-based noindex from a Search Console export: make prune CSV=pages.csv
	$(PY) tools/prune.py $(CSV)

clean:
	rm -rf build

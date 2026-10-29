#!/usr/bin/env python3
"""Encode a projected elevation raster as Mapbox Terrain-RGB.

Run after gdalwarp so elevation resampling happens on scalar elevation values,
never on already-encoded RGB channels.

Encoding: elevation_m = -10000 + (R*256^2 + G*256 + B) * 0.1
"""
from __future__ import annotations
import argparse
import math
from pathlib import Path

import numpy as np
from osgeo import gdal

gdal.UseExceptions()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("source", type=Path)
    ap.add_argument("output", type=Path)
    ap.add_argument("--block-rows", type=int, default=1024)
    args = ap.parse_args()

    src = gdal.Open(str(args.source), gdal.GA_ReadOnly)
    if src is None or src.RasterCount < 1:
        raise SystemExit("cannot open source DEM")
    band = src.GetRasterBand(1)
    nodata = band.GetNoDataValue()
    width, height = src.RasterXSize, src.RasterYSize

    driver = gdal.GetDriverByName("GTiff")
    dst = driver.Create(
        str(args.output), width, height, 4, gdal.GDT_Byte,
        options=["TILED=YES", "COMPRESS=DEFLATE", "PREDICTOR=2", "BIGTIFF=IF_SAFER"],
    )
    dst.SetGeoTransform(src.GetGeoTransform())
    dst.SetProjection(src.GetProjection())

    for y in range(0, height, args.block_rows):
        rows = min(args.block_rows, height - y)
        z = band.ReadAsArray(0, y, width, rows).astype(np.float64, copy=False)
        invalid = ~np.isfinite(z)
        if nodata is not None and math.isfinite(float(nodata)):
            invalid |= np.isclose(z, float(nodata), atol=1e-6)

        encoded = np.rint((z + 10000.0) * 10.0)
        encoded = np.clip(encoded, 0, 16777215).astype(np.uint32)
        encoded[invalid] = 0

        r = ((encoded >> 16) & 255).astype(np.uint8)
        g = ((encoded >> 8) & 255).astype(np.uint8)
        b = (encoded & 255).astype(np.uint8)
        a = np.where(invalid, 0, 255).astype(np.uint8)

        for index, arr in enumerate((r, g, b, a), start=1):
            dst.GetRasterBand(index).WriteArray(arr, 0, y)

    dst.GetRasterBand(4).SetColorInterpretation(gdal.GCI_AlphaBand)
    dst.FlushCache()
    dst = None
    src = None
    print(f"wrote Terrain-RGB raster: {args.output}")


if __name__ == "__main__":
    main()

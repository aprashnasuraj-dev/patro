#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { routeGeoJson, routeGpx, routeKml } from "./map/export-core.mjs";
const out=resolve(process.argv[2]||"docs/verification/export-fixtures");await mkdir(out,{recursive:true});
const input={from:{lat:27.7172,lng:85.3240,label:"Kathmandu"},stops:[{lat:27.6721,lng:85.4280,label:"Bhaktapur"}],to:{lat:27.6220,lng:85.5420,label:"Dhulikhel"},places:[{lat:27.6710,lng:85.4290,label:"Sourced place"}],route:{distance:32000,duration:3600,geometry:{type:"LineString",coordinates:[[85.3240,27.7172],[85.4280,27.6721],[85.5420,27.6220]]}}};
await Promise.all([writeFile(join(out,"route.geojson"),routeGeoJson(input)),writeFile(join(out,"route.gpx"),routeGpx(input)),writeFile(join(out,"route.kml"),routeKml(input))]);console.log(out);

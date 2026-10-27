import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
// Route-local field labels, examples and visual presentation are generated from the immutable tool allocation.
const config:Config={
  "id": "TOOL-0433",
  "name": "Tongue Weight, Payload & GCWR Checker",
  "variant": "gauge",
  "tagline": "Tow-vehicle and hitch envelope",
  "action": "Check scenario",
  "fields": [
    {
      "key": "loadedTrailer",
      "label": "Loaded trailer actual mass",
      "default": 5000,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 200000,
      "step": "any",
      "unit": "lb"
    },
    {
      "key": "tonguePct",
      "label": "Tongue percentage of trailer actual mass",
      "default": 12,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 40,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "truckPayload",
      "label": "Available vehicle payload rating",
      "default": 1600,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100000,
      "step": "any",
      "unit": "lb"
    },
    {
      "key": "occupants",
      "label": "Occupants and cargo in tow vehicle",
      "default": 600,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100000,
      "step": "any",
      "unit": "lb"
    },
    {
      "key": "hitchLimit",
      "label": "Hitch tongue vertical-load rating",
      "default": 900,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100000,
      "step": "any",
      "unit": "lb"
    },
    {
      "key": "towRating",
      "label": "Tow vehicle permitted trailer rating",
      "default": 7000,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 300000,
      "step": "any",
      "unit": "lb"
    },
    {
      "key": "gcwr",
      "label": "Gross combined weight rating",
      "default": 15000,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 400000,
      "step": "any",
      "unit": "lb"
    },
    {
      "key": "truckGVWWithoutTongue",
      "label": "Truck actual loaded weight excluding trailer tongue",
      "default": 7300,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 150000,
      "step": "any",
      "unit": "lb"
    }
  ]
};
mount(config,calculate);

import {attach} from './visual';
import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0477",
  "name": "Cartons per Pallet Calculator (US/UK/AU Pallets)",
  "variant": "gauge",
  "tagline": "Compare six axis-aligned orientations on standard pallet footprints",
  "action": "Optimize carton rotations",
  "fields": [
    {
      "key": "pallet",
      "label": "Pallet footprint",
      "default": "US GMA 48×40 in",
      "type": "select",
      "help": "",
      "options": [
        "US GMA 48×40 in",
        "UK EUR 1200×1000 mm",
        "AU 1165×1165 mm"
      ]
    },
    {
      "key": "cartonL",
      "label": "Carton length",
      "default": 16,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 200,
      "step": "any",
      "unit": "in"
    },
    {
      "key": "cartonW",
      "label": "Carton width",
      "default": 12,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 200,
      "step": "any",
      "unit": "in"
    },
    {
      "key": "cartonH",
      "label": "Carton height",
      "default": 10,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 200,
      "step": "any",
      "unit": "in"
    },
    {
      "key": "cartonWeight",
      "label": "Weight per carton",
      "default": 20,
      "type": "number",
      "help": "",
      "min": 0.01,
      "max": 1000,
      "step": "any",
      "unit": "lb"
    },
    {
      "key": "maxHeight",
      "label": "Max loaded height including pallet",
      "default": 60,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 300,
      "step": "any",
      "unit": "in"
    },
    {
      "key": "palletHeight",
      "label": "Empty pallet height",
      "default": 6,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 30,
      "step": "any",
      "unit": "in"
    },
    {
      "key": "payload",
      "label": "Verified max payload",
      "default": 2000,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 100000,
      "step": "any",
      "unit": "lb"
    }
  ]
};
mount(config,calculate);

attach();

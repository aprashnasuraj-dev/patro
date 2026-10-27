import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0444",
  "name": "Max Print Size from Pixels",
  "variant": "gauge",
  "tagline": "Native pixel dimensions to printable physical size",
  "action": "Find printable size",
  "fields": [
    {
      "key": "w",
      "label": "Source width",
      "default": 4000,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 200000,
      "step": "any",
      "unit": "px"
    },
    {
      "key": "h",
      "label": "Source height",
      "default": 3000,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 200000,
      "step": "any",
      "unit": "px"
    },
    {
      "key": "ppi",
      "label": "Target effective PPI",
      "default": 300,
      "type": "number",
      "help": "",
      "min": 36,
      "max": 2400,
      "step": "any",
      "unit": "pixels/inch"
    },
    {
      "key": "bleed",
      "label": "Bleed on each edge",
      "default": 0,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 20,
      "step": "any",
      "unit": "mm"
    }
  ]
};
mount(config,calculate);

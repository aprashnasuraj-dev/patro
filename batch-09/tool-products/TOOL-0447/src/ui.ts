import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
import {attachVisual} from '../_vendor/visual';
const config:Config={
  "id": "TOOL-0447",
  "name": "Cross-Stitch Fabric Size Calculator",
  "variant": "gauge",
  "tagline": "Stitches, fabric count and finishing allowance",
  "action": "Size my fabric",
  "fields": [
    {
      "key": "stitchesW",
      "label": "Pattern width in stitches",
      "default": 180,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 30000,
      "step": "any",
      "unit": ""
    },
    {
      "key": "stitchesH",
      "label": "Pattern height in stitches",
      "default": 140,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 30000,
      "step": "any",
      "unit": ""
    },
    {
      "key": "count",
      "label": "Fabric thread count per inch",
      "default": 28,
      "type": "number",
      "help": "",
      "min": 6,
      "max": 100,
      "step": "any",
      "unit": "threads/in"
    },
    {
      "key": "over",
      "label": "Threads crossed per stitch",
      "default": 2,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 4,
      "step": "any",
      "unit": "threads/stitch"
    },
    {
      "key": "border",
      "label": "Finishing allowance per edge",
      "default": 3,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 20,
      "step": "any",
      "unit": "in"
    },
    {
      "key": "waste",
      "label": "Extra fabric allowance",
      "default": 0,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 30,
      "step": "any",
      "unit": "%"
    }
  ]
};
mount(config,calculate);
attachVisual(config.id,calculate);

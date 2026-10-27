import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
import {attachVisual} from '../_vendor/visual';
const config:Config={
  "id": "TOOL-0442",
  "name": "Print Bleed & Safe-Zone Template Generator",
  "variant": "gauge",
  "tagline": "Trim, bleed and safe artwork measurements",
  "action": "Generate print dimensions",
  "fields": [
    {
      "key": "width",
      "label": "Finished trim width",
      "default": 210,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 1500,
      "step": "any",
      "unit": "mm"
    },
    {
      "key": "height",
      "label": "Finished trim height",
      "default": 297,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 1500,
      "step": "any",
      "unit": "mm"
    },
    {
      "key": "bleed",
      "label": "Bleed each side",
      "default": 3,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 50,
      "step": "any",
      "unit": "mm"
    },
    {
      "key": "safe",
      "label": "Safe inset from trim",
      "default": 5,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "mm"
    },
    {
      "key": "dpi",
      "label": "Raster reference resolution",
      "default": 300,
      "type": "number",
      "help": "",
      "min": 72,
      "max": 1200,
      "step": "any",
      "unit": "dpi"
    }
  ]
};
mount(config,calculate);
attachVisual(config.id,calculate);

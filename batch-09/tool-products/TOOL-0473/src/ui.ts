import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0473",
  "name": "Carrier Surcharge & Oversize Checker",
  "variant": "compare",
  "tagline": "Dimensional-weight calculation with carrier-supplied thresholds",
  "action": "Check package size",
  "fields": [
    {
      "key": "length",
      "label": "Longest outer carton side",
      "default": 30,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 240,
      "step": "any",
      "unit": "in"
    },
    {
      "key": "width",
      "label": "Second side",
      "default": 20,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 240,
      "step": "any",
      "unit": "in"
    },
    {
      "key": "height",
      "label": "Third side",
      "default": 12,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 240,
      "step": "any",
      "unit": "in"
    },
    {
      "key": "weight",
      "label": "Actual packed weight",
      "default": 25,
      "type": "number",
      "help": "",
      "min": 0.01,
      "max": 1000,
      "step": "any",
      "unit": "lb"
    },
    {
      "key": "divisor",
      "label": "Verified DIM divisor (in³/lb)",
      "default": 139,
      "type": "number",
      "help": "",
      "min": 50,
      "max": 1000,
      "step": "any",
      "unit": ""
    },
    {
      "key": "maxLongest",
      "label": "Service largest allowed length (verified)",
      "default": 108,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 300,
      "step": "any",
      "unit": "in"
    },
    {
      "key": "maxGirth",
      "label": "Service maximum length + girth (verified)",
      "default": 165,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 500,
      "step": "any",
      "unit": "in"
    },
    {
      "key": "handling",
      "label": "Verified added charge if oversized",
      "default": 0,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 10000,
      "step": "any",
      "unit": "currency"
    }
  ]
};
mount(config,calculate);

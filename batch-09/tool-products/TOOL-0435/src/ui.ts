import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
// Route-local field labels, examples and visual presentation are generated from the immutable tool allocation.
const config:Config={
  "id": "TOOL-0435",
  "name": "Load Index & Speed Rating Decoder",
  "variant": "decoder",
  "tagline": "Tire service-description decoding",
  "action": "Decode rating",
  "fields": [
    {
      "key": "index",
      "label": "Tire load index",
      "default": 91,
      "type": "number",
      "help": "",
      "min": 84,
      "max": 120,
      "step": "any",
      "unit": ""
    },
    {
      "key": "speed",
      "label": "Speed rating symbol",
      "default": "H",
      "type": "select",
      "help": "",
      "options": [
        "Q",
        "R",
        "S",
        "T",
        "U",
        "H",
        "V",
        "W",
        "Y"
      ]
    }
  ]
};
mount(config,calculate);

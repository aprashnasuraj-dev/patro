import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0471",
  "name": "Quarter-to-Semester Credit Converter",
  "variant": "compare",
  "tagline": "Mathematical quarter ↔ semester conversion with policy caveat",
  "action": "Convert academic credits",
  "fields": [
    {
      "key": "direction",
      "label": "Conversion",
      "default": "quarter → semester",
      "type": "select",
      "help": "",
      "options": [
        "quarter → semester",
        "semester → quarter"
      ]
    },
    {
      "key": "credits",
      "label": "Original credit quantity",
      "default": 45,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100000,
      "step": "any",
      "unit": "credits"
    },
    {
      "key": "ratio",
      "label": "Receiving-institution semester/quarter multiplier",
      "default": 0.6666666666666666,
      "type": "number",
      "help": "",
      "min": 0.1,
      "max": 10,
      "step": "any",
      "unit": "ratio"
    },
    {
      "key": "round",
      "label": "Display decimal places",
      "default": 2,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 4,
      "step": "any",
      "unit": "decimals"
    }
  ]
};
mount(config,calculate);

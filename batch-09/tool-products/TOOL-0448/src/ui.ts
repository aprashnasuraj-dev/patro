import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
import {attachVisual} from '../_vendor/visual';
const config:Config={
  "id": "TOOL-0448",
  "name": "Yarn Yardage & Substitution Calculator",
  "variant": "ledger",
  "tagline": "Length-based skein substitution with gauge caveats",
  "action": "Estimate substitute yarn",
  "fields": [
    {
      "key": "originalSkeins",
      "label": "Pattern skeins",
      "default": 6,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 5000,
      "step": "any",
      "unit": ""
    },
    {
      "key": "originalMeters",
      "label": "Meters per original skein",
      "default": 100,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 10000,
      "step": "any",
      "unit": "m"
    },
    {
      "key": "replacementMeters",
      "label": "Meters per substitute skein",
      "default": 125,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 10000,
      "step": "any",
      "unit": "m"
    },
    {
      "key": "waste",
      "label": "Safety allowance",
      "default": 12,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 60,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "price",
      "label": "Price per substitute skein",
      "default": 6.5,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100000.0,
      "step": "any",
      "unit": "currency"
    }
  ]
};
mount(config,calculate);
attachVisual(config.id,calculate);

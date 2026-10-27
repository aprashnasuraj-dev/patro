import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
// Route-local field labels, examples and visual presentation are generated from the immutable tool allocation.
const config:Config={
  "id": "TOOL-0430",
  "name": "Move-Out Damage Depreciation Calculator",
  "variant": "gauge",
  "tagline": "Fair wear versus chargeable damage",
  "action": "Check scenario",
  "fields": [
    {
      "key": "replacement",
      "label": "Like-for-like new replacement cost",
      "default": 600,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "life",
      "label": "Documented useful life",
      "default": 8,
      "type": "number",
      "help": "",
      "min": 0.1,
      "max": 100,
      "step": "any",
      "unit": "years"
    },
    {
      "key": "age",
      "label": "Age when damaged",
      "default": 5,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "years"
    },
    {
      "key": "repair",
      "label": "Documented repair cost",
      "default": 450,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "damagePct",
      "label": "Chargeable damage responsibility",
      "default": 100,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "%"
    }
  ]
};
mount(config,calculate);

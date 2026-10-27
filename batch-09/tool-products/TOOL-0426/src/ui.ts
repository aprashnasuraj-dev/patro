import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
// Route-local field labels, examples and visual presentation are generated from the immutable tool allocation.
const config:Config={
  "id": "TOOL-0426",
  "name": "Rental Depreciation & Recapture Calculator",
  "variant": "ledger",
  "tagline": "Residential rental depreciation scenarios",
  "action": "Check scenario",
  "fields": [
    {
      "key": "purchase",
      "label": "Original property basis",
      "default": 400000,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "land",
      "label": "Nondepreciable land allocation",
      "default": 100000,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "improvements",
      "label": "Capitalized building improvements (same life assumed)",
      "default": 0,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "years",
      "label": "Equivalent depreciable years",
      "default": 5,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 27.5,
      "step": "any",
      "unit": "years"
    },
    {
      "key": "sale",
      "label": "Net sale proceeds after selling costs",
      "default": 450000,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    }
  ]
};
mount(config,calculate);

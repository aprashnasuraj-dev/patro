import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
// Route-local field labels, examples and visual presentation are generated from the immutable tool allocation.
const config:Config={
  "id": "TOOL-0427",
  "name": "Lease Termination Cost Calculator",
  "variant": "compare",
  "tagline": "Break-lease settlement comparison",
  "action": "Check scenario",
  "fields": [
    {
      "key": "monthly",
      "label": "Monthly base rent",
      "default": 1800,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "months",
      "label": "Months left in contract",
      "default": 7,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 240,
      "step": "any",
      "unit": ""
    },
    {
      "key": "fee",
      "label": "Proposed termination fee",
      "default": 2000,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "reletting",
      "label": "Mitigation / reletting charge",
      "default": 700,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "deposit",
      "label": "Deposit expected to be retained",
      "default": 0,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "concessions",
      "label": "Agreed credits / released rent",
      "default": 0,
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

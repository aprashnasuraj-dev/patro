import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0454",
  "name": "Prescription Run-Out & Refill Date Calculator",
  "variant": "timeline",
  "tagline": "Medication stock countdown using confirmed dosage",
  "action": "Plan refill request",
  "fields": [
    {
      "key": "start",
      "label": "First day of this supply",
      "default": "2026-11-01",
      "type": "date",
      "help": ""
    },
    {
      "key": "units",
      "label": "Medication units on hand",
      "default": 60,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 100000,
      "step": "any",
      "unit": "tablets / units"
    },
    {
      "key": "daily",
      "label": "Units per day exactly as prescribed",
      "default": 2,
      "type": "number",
      "help": "",
      "min": 0.01,
      "max": 1000,
      "step": "any",
      "unit": "units/day"
    },
    {
      "key": "lead",
      "label": "Refill lead time",
      "default": 7,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 90,
      "step": "any",
      "unit": "calendar days"
    },
    {
      "key": "other",
      "label": "Additional medication units already on hand",
      "default": 0,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100000,
      "step": "any",
      "unit": "units"
    }
  ]
};
mount(config,calculate);

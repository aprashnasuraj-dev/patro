import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
// Route-local field labels, examples and visual presentation are generated from the immutable tool allocation.
const config:Config={
  "id": "TOOL-0429",
  "name": "UK Tenancy Deposit Protection Penalty Calculator",
  "variant": "timeline",
  "tagline": "Deposit protection exposure model",
  "action": "Check schedule",
  "fields": [
    {
      "key": "deposit",
      "label": "Tenancy deposit (£)",
      "default": 1200,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "received",
      "label": "Deposit received",
      "default": "2026-06-01",
      "type": "date",
      "help": ""
    },
    {
      "key": "protected",
      "label": "Deposit protected (leave blank if not protected)",
      "default": "",
      "type": "date-optional",
      "help": ""
    }
  ]
};
mount(config,calculate);

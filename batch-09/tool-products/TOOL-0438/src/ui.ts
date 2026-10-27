import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
// Route-local field labels, examples and visual presentation are generated from the immutable tool allocation.
const config:Config={
  "id": "TOOL-0438",
  "name": "Gig Driver True Profit Calculator",
  "variant": "ledger",
  "tagline": "Delivery-driver economic income",
  "action": "Check scenario",
  "fields": [
    {
      "key": "gross",
      "label": "Gross customer or platform earnings",
      "default": 1700,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "fees",
      "label": "Platform and other deductions",
      "default": 170,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "miles",
      "label": "Total business miles",
      "default": 650,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "fuel",
      "label": "Fuel/energy per mile",
      "default": 0.13,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 10,
      "step": "any",
      "unit": "$/mi"
    },
    {
      "key": "wear",
      "label": "Maintenance, tires and depreciation per mile",
      "default": 0.22,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 10,
      "step": "any",
      "unit": "$/mi"
    },
    {
      "key": "fixed",
      "label": "Period-specific insurance/permit/other costs",
      "default": 100,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "hours",
      "label": "All active and waiting hours",
      "default": 45,
      "type": "number",
      "help": "",
      "min": 0.1,
      "max": 1000,
      "step": "any",
      "unit": "hours"
    },
    {
      "key": "reserve",
      "label": "Income tax cash reserve on positive margin",
      "default": 20,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 80,
      "step": "any",
      "unit": "%"
    }
  ]
};
mount(config,calculate);

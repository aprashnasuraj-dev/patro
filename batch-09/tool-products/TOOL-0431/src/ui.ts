import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
// Route-local field labels, examples and visual presentation are generated from the immutable tool allocation.
const config:Config={
  "id": "TOOL-0431",
  "name": "Short-Term Rental Occupancy Tax Calculator by City",
  "variant": "ledger",
  "tagline": "City-specific occupancy tax worksheet",
  "action": "Check scenario",
  "fields": [
    {
      "key": "city",
      "label": "City and jurisdiction",
      "default": "Hypothetical City (sample only)",
      "type": "text",
      "help": ""
    },
    {
      "key": "rate",
      "label": "Rent per night",
      "default": 175,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "nights",
      "label": "Taxable nights",
      "default": 4,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 365,
      "step": "any",
      "unit": "nights"
    },
    {
      "key": "fee",
      "label": "Taxable cleaning/service charges",
      "default": 80,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "localPct",
      "label": "Illustrative local rate — replace with verified value",
      "default": 8,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "otherPct",
      "label": "Illustrative second rate — replace with verified value",
      "default": 2,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "collected",
      "label": "Tax already remitted by platform",
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

import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
// Route-local field labels, examples and visual presentation are generated from the immutable tool allocation.
const config:Config={
  "id": "TOOL-0421",
  "name": "Home Office Deduction Comparator (US/UK/CA/AU)",
  "variant": "compare",
  "tagline": "Four-country workspace expense comparison",
  "action": "Check scenario",
  "fields": [
    {
      "key": "country",
      "label": "Tax location",
      "default": "US",
      "type": "select",
      "help": "",
      "options": [
        "US",
        "UK",
        "CA",
        "AU"
      ]
    },
    {
      "key": "officeSqFt",
      "label": "Workspace area",
      "default": 120,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 100000,
      "step": "any",
      "unit": "ft²"
    },
    {
      "key": "homeSqFt",
      "label": "Total dwelling area",
      "default": 1000,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 1000000,
      "step": "any",
      "unit": "ft²"
    },
    {
      "key": "annualCosts",
      "label": "Eligible annual household costs",
      "default": 12000,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "businessTimePct",
      "label": "Qualified business-use time",
      "default": 100,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "months",
      "label": "Eligible months",
      "default": 12,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 12,
      "step": "any",
      "unit": "months"
    },
    {
      "key": "businessIncome",
      "label": "Business income available for deduction",
      "default": 50000,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "auRate",
      "label": "Verified AU fixed rate per hour",
      "default": 0.7,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 10,
      "step": "any",
      "unit": "AUD/hour"
    },
    {
      "key": "auHours",
      "label": "Recorded annual AU work hours",
      "default": 1200,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 8760,
      "step": "any",
      "unit": "hours"
    }
  ]
};
mount(config,calculate);

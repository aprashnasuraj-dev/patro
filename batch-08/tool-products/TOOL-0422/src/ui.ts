import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
// Route-local field labels, examples and visual presentation are generated from the immutable tool allocation.
const config:Config={
  "id": "TOOL-0422",
  "name": "Contractor Break-Even Rate Calculator",
  "variant": "compare",
  "tagline": "Salary-to-contract conversion",
  "action": "Check scenario",
  "fields": [
    {
      "key": "salary",
      "label": "Employee annual gross salary",
      "default": 90000,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "benefits",
      "label": "Annual benefits to replace",
      "default": 18000,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "overhead",
      "label": "Contractor annual expenses",
      "default": 12000,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "weeks",
      "label": "Billable weeks",
      "default": 46,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 52,
      "step": "any",
      "unit": ""
    },
    {
      "key": "hours",
      "label": "Billable hours per week",
      "default": 30,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 100,
      "step": "any",
      "unit": ""
    },
    {
      "key": "extraTaxPct",
      "label": "Incremental tax / reserve percentage",
      "default": 8,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 70,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "contingencyPct",
      "label": "Profit / risk reserve percentage",
      "default": 10,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 60,
      "step": "any",
      "unit": "%"
    }
  ]
};
mount(config,calculate);

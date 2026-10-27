import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
// Route-local field labels, examples and visual presentation are generated from the immutable tool allocation.
const config:Config={
  "id": "TOOL-0428",
  "name": "Property Tax Appeal Savings Estimator",
  "variant": "compare",
  "tagline": "Assessment challenge payoff",
  "action": "Check scenario",
  "fields": [
    {
      "key": "assessed",
      "label": "Current taxable assessment",
      "default": 350000,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "proposed",
      "label": "Supported lower assessment",
      "default": 310000,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "rate",
      "label": "Effective annual tax per 1000 value",
      "default": 18,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000,
      "step": "any",
      "unit": "per $1,000"
    },
    {
      "key": "success",
      "label": "Estimated success probability",
      "default": 50,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "filing",
      "label": "Filing / appraisal costs",
      "default": 250,
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

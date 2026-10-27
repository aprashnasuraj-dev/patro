import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0490",
  "name": "Firewood Volume & Cost-per-BTU Calculator",
  "variant": "compare",
  "tagline": "Stacked cord volume and useful heat economics",
  "action": "Calculate wood heat value",
  "fields": [
    {
      "key": "length",
      "label": "Stacked wood length",
      "default": 8,
      "type": "number",
      "min": 0.1,
      "max": 300,
      "step": "any",
      "unit": "ft",
      "help": ""
    },
    {
      "key": "height",
      "label": "Stacked wood height",
      "default": 4,
      "type": "number",
      "min": 0.1,
      "max": 30,
      "step": "any",
      "unit": "ft",
      "help": ""
    },
    {
      "key": "depth",
      "label": "Stacked wood depth",
      "default": 4,
      "type": "number",
      "min": 0.1,
      "max": 30,
      "step": "any",
      "unit": "ft",
      "help": ""
    },
    {
      "key": "price",
      "label": "Total delivered wood price",
      "default": 350,
      "type": "number",
      "min": 0.01,
      "max": 1000000,
      "step": "any",
      "unit": "currency",
      "help": ""
    },
    {
      "key": "btu",
      "label": "Assumed species/seasoning heat per full cord",
      "default": 20,
      "type": "number",
      "min": 1,
      "max": 50,
      "step": "any",
      "unit": "million BTU/cord",
      "help": "Enter your source-backed estimate for species and moisture."
    },
    {
      "key": "eff",
      "label": "Burning appliance overall useful-heat efficiency",
      "default": 70,
      "type": "number",
      "min": 10,
      "max": 95,
      "step": "any",
      "unit": "%",
      "help": ""
    }
  ]
};
mount(config,calculate);
import {installView} from './view';
installView();

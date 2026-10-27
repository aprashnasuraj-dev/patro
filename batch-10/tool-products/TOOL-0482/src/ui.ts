import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0482",
  "name": "ACoS/ROAS Converter & Break-Even Calculator",
  "variant": "compare",
  "tagline": "Advertising economics and contribution margin",
  "action": "Calculate campaign economics",
  "fields": [
    {
      "key": "spend",
      "label": "Advertising spend",
      "default": 250,
      "type": "number",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": "currency",
      "help": ""
    },
    {
      "key": "sales",
      "label": "Attributed advertising sales",
      "default": 1000,
      "type": "number",
      "min": 0,
      "max": 10000000000.0,
      "step": "any",
      "unit": "currency",
      "help": ""
    },
    {
      "key": "margin",
      "label": "Product gross margin before variable fees",
      "default": 45,
      "type": "number",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "%",
      "help": ""
    },
    {
      "key": "fees",
      "label": "Additional variable fees and returns reserve",
      "default": 12,
      "type": "number",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "%",
      "help": ""
    },
    {
      "key": "fixed",
      "label": "Fixed campaign costs beyond ads",
      "default": 0,
      "type": "number",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": "currency",
      "help": ""
    }
  ]
};
mount(config,calculate);
import {installView} from './view';
installView();

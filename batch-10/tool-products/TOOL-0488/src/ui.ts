import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0488",
  "name": "Fertilizer & Seed Spreader Settings Calculator",
  "variant": "gauge",
  "tagline": "Calibrate application rates by measured trial",
  "action": "Calibrate spread rate",
  "fields": [
    {
      "key": "material",
      "label": "Spread material",
      "default": "Fertilizer",
      "type": "select",
      "options": [
        "Fertilizer",
        "Seed"
      ],
      "help": ""
    },
    {
      "key": "target",
      "label": "Target product application mass",
      "default": 3,
      "type": "number",
      "min": 0.01,
      "max": 100,
      "step": "any",
      "unit": "kg per 100 m²",
      "help": ""
    },
    {
      "key": "area",
      "label": "Full treatment area",
      "default": 250,
      "type": "number",
      "min": 1,
      "max": 1000000,
      "step": "any",
      "unit": "m²",
      "help": ""
    },
    {
      "key": "width",
      "label": "Actual effective spread width",
      "default": 3,
      "type": "number",
      "min": 0.1,
      "max": 30,
      "step": "any",
      "unit": "m",
      "help": ""
    },
    {
      "key": "distance",
      "label": "Calibration strip travel distance",
      "default": 20,
      "type": "number",
      "min": 1,
      "max": 1000,
      "step": "any",
      "unit": "m",
      "help": ""
    },
    {
      "key": "collected",
      "label": "Product collected / dispersed in calibration strip",
      "default": 1.4,
      "type": "number",
      "min": 0.001,
      "max": 500,
      "step": "any",
      "unit": "kg",
      "help": ""
    }
  ]
};
mount(config,calculate);
import {installView} from './view';
installView();

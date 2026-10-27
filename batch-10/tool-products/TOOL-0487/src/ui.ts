import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0487",
  "name": "Raised Bed Soil & Compost Calculator",
  "variant": "split",
  "tagline": "Bulk mix volume, bag counts and allowances",
  "action": "Estimate soil materials",
  "fields": [
    {
      "key": "unit",
      "label": "Dimension unit",
      "default": "ft",
      "type": "select",
      "options": [
        "ft",
        "m"
      ],
      "help": ""
    },
    {
      "key": "length",
      "label": "Inside bed length",
      "default": 8,
      "type": "number",
      "min": 0.1,
      "max": 500,
      "step": "any",
      "unit": "",
      "help": ""
    },
    {
      "key": "width",
      "label": "Inside bed width",
      "default": 4,
      "type": "number",
      "min": 0.1,
      "max": 200,
      "step": "any",
      "unit": "",
      "help": ""
    },
    {
      "key": "depth",
      "label": "Planned fill depth",
      "default": 1,
      "type": "number",
      "min": 0.05,
      "max": 10,
      "step": "any",
      "unit": "",
      "help": ""
    },
    {
      "key": "beds",
      "label": "Identical beds",
      "default": 2,
      "type": "number",
      "min": 1,
      "max": 1000,
      "step": "any",
      "unit": "count",
      "help": ""
    },
    {
      "key": "compost",
      "label": "Compost percentage by volume",
      "default": 35,
      "type": "number",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "%",
      "help": ""
    },
    {
      "key": "extra",
      "label": "Settling and purchase allowance",
      "default": 10,
      "type": "number",
      "min": 0,
      "max": 40,
      "step": "any",
      "unit": "%",
      "help": ""
    },
    {
      "key": "bag",
      "label": "Bag size",
      "default": 40,
      "type": "number",
      "min": 5,
      "max": 200,
      "step": "any",
      "unit": "L",
      "help": ""
    }
  ]
};
mount(config,calculate);
import {installView} from './view';
installView();

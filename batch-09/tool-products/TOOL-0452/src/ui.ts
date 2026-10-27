import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
import {attachVisual} from '../_vendor/visual';
const config:Config={
  "id": "TOOL-0452",
  "name": "Pool Chemical Dosing Calculator",
  "variant": "gauge",
  "tagline": "Concentration-driven pool chlorine dosing",
  "action": "Estimate chlorine quantity",
  "fields": [
    {
      "key": "poolL",
      "label": "Pool water volume",
      "default": 50000,
      "type": "number",
      "help": "",
      "min": 100,
      "max": 100000000,
      "step": "any",
      "unit": "L"
    },
    {
      "key": "current",
      "label": "Measured free chlorine",
      "default": 1,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 30,
      "step": "any",
      "unit": "ppm"
    },
    {
      "key": "target",
      "label": "Target free chlorine",
      "default": 3,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 30,
      "step": "any",
      "unit": "ppm"
    },
    {
      "key": "percent",
      "label": "Available chlorine by weight on product label",
      "default": 10,
      "type": "number",
      "help": "",
      "min": 0.1,
      "max": 30,
      "step": "any",
      "unit": "% w/w"
    },
    {
      "key": "density",
      "label": "Liquid product density from SDS",
      "default": 1.16,
      "type": "number",
      "help": "",
      "min": 0.8,
      "max": 1.5,
      "step": "any",
      "unit": "kg/L"
    },
    {
      "key": "stabilized",
      "label": "Using CYA chlorine stabilizer?",
      "default": "no",
      "type": "select",
      "help": "",
      "options": [
        "no",
        "yes"
      ]
    }
  ]
};
mount(config,calculate);
attachVisual(config.id,calculate);

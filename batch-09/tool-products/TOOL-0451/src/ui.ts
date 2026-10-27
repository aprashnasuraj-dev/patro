import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
import {attachVisual} from '../_vendor/visual';
const config:Config={
  "id": "TOOL-0451",
  "name": "Aquarium Volume, Water Change & Dose Calculator",
  "variant": "gauge",
  "tagline": "Aquarium geometric volume and water-treatment math",
  "action": "Estimate tank water",
  "fields": [
    {
      "key": "shape",
      "label": "Tank shape",
      "default": "rectangular",
      "type": "select",
      "help": "",
      "options": [
        "rectangular",
        "cylinder"
      ]
    },
    {
      "key": "length",
      "label": "Internal length or cylinder diameter",
      "default": 80,
      "type": "number",
      "help": "",
      "min": 10,
      "max": 600,
      "step": "any",
      "unit": "cm"
    },
    {
      "key": "width",
      "label": "Internal width (rectangular only)",
      "default": 35,
      "type": "number",
      "help": "",
      "min": 10,
      "max": 600,
      "step": "any",
      "unit": "cm"
    },
    {
      "key": "height",
      "label": "Actual filled water height",
      "default": 40,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 400,
      "step": "any",
      "unit": "cm"
    },
    {
      "key": "displacement",
      "label": "Decor/substrate volume displacement estimate",
      "default": 8,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 70,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "change",
      "label": "Water-change fraction",
      "default": 25,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 95,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "dosePer100",
      "label": "Manufacturer dose per 100 L",
      "default": 10,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100000,
      "step": "any",
      "unit": "mL/100 L"
    },
    {
      "key": "doseScope",
      "label": "Dose for",
      "default": "new-water",
      "type": "select",
      "help": "",
      "options": [
        "new-water",
        "whole-tank"
      ]
    }
  ]
};
mount(config,calculate);
attachVisual(config.id,calculate);

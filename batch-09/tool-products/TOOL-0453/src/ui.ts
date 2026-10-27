import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0453",
  "name": "Glasses to Contact Lens Prescription Converter",
  "variant": "compare",
  "tagline": "Spectacle optical vertex conversion, not a contact lens prescription",
  "action": "Calculate optical power",
  "fields": [
    {
      "key": "sphere",
      "label": "Spectacle sphere power",
      "default": -6,
      "type": "number",
      "help": "",
      "min": -30,
      "max": 30,
      "step": "any",
      "unit": "D"
    },
    {
      "key": "cyl",
      "label": "Spectacle cylinder power",
      "default": -1.5,
      "type": "number",
      "help": "",
      "min": -12,
      "max": 12,
      "step": "any",
      "unit": "D"
    },
    {
      "key": "axis",
      "label": "Spectacle cylinder axis",
      "default": 180,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 180,
      "step": "any",
      "unit": "degrees"
    },
    {
      "key": "vertex",
      "label": "Spectacle lens vertex distance",
      "default": 12,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 30,
      "step": "any",
      "unit": "mm"
    }
  ]
};
mount(config,calculate);

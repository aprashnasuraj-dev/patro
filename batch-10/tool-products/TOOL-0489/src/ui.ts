import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0489",
  "name": "Irrigation Run-Time Calculator",
  "variant": "timeline",
  "tagline": "Sprinkler zone timing from measured flow",
  "action": "Estimate sprinkler runtime",
  "fields": [
    {
      "key": "area",
      "label": "Total planted area",
      "default": 2000,
      "type": "number",
      "min": 10,
      "max": 10000000.0,
      "step": "any",
      "unit": "ft²",
      "help": ""
    },
    {
      "key": "target",
      "label": "Weekly target irrigation depth",
      "default": 1,
      "type": "number",
      "min": 0,
      "max": 10,
      "step": "any",
      "unit": "inches",
      "help": ""
    },
    {
      "key": "rain",
      "label": "Effective rainfall for the week",
      "default": 0.25,
      "type": "number",
      "min": 0,
      "max": 10,
      "step": "any",
      "unit": "inches",
      "help": ""
    },
    {
      "key": "eff",
      "label": "Estimated field application efficiency",
      "default": 80,
      "type": "number",
      "min": 20,
      "max": 100,
      "step": "any",
      "unit": "%",
      "help": ""
    },
    {
      "key": "flow",
      "label": "Measured flow per active zone",
      "default": 8,
      "type": "number",
      "min": 0.1,
      "max": 10000,
      "step": "any",
      "unit": "US gal/min",
      "help": ""
    },
    {
      "key": "zones",
      "label": "Equal-area irrigation zones",
      "default": 4,
      "type": "number",
      "min": 1,
      "max": 100,
      "step": "any",
      "unit": "zones",
      "help": ""
    },
    {
      "key": "cycles",
      "label": "Split runtime into cycles per zone",
      "default": 2,
      "type": "number",
      "min": 1,
      "max": 24,
      "step": "any",
      "unit": "cycles",
      "help": ""
    }
  ]
};
mount(config,calculate);
import {installView} from './view';
installView();

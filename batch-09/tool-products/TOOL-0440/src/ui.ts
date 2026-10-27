import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
// Route-local field labels, examples and visual presentation are generated from the immutable tool allocation.
const config:Config={
  "id": "TOOL-0440",
  "name": "Net VLT & Window Tint Law Checker",
  "variant": "gauge",
  "tagline": "Visible light transmission compliance scenario",
  "action": "Check scenario",
  "fields": [
    {
      "key": "jurisdiction",
      "label": "State/country (rule not auto-verified)",
      "default": "Verify state and window",
      "type": "text",
      "help": ""
    },
    {
      "key": "window",
      "label": "Window position",
      "default": "front-side",
      "type": "select",
      "help": "",
      "options": [
        "front-side",
        "rear-side",
        "rear-windshield",
        "windshield"
      ]
    },
    {
      "key": "original",
      "label": "Factory glass VLT",
      "default": 75,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "film",
      "label": "Film VLT",
      "default": 35,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "minimum",
      "label": "Verified legal minimum net VLT",
      "default": 35,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "tolerance",
      "label": "Verified allowable measurement tolerance",
      "default": 0,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 20,
      "step": "any",
      "unit": "%"
    }
  ]
};
mount(config,calculate);

import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
import {attachSpecial} from './special';
const config:Config={
  "id": "TOOL-0463",
  "name": "Court Pleading Paper Generator",
  "variant": "gauge",
  "tagline": "Printable ruled pleading-paper guide with editable numbering",
  "action": "Layout pleading paper",
  "fields": [
    {
      "key": "page",
      "label": "Paper format",
      "default": "US Letter",
      "type": "select",
      "help": "",
      "options": [
        "US Letter",
        "A4"
      ]
    },
    {
      "key": "lines",
      "label": "Numbered writing lines",
      "default": 28,
      "type": "number",
      "help": "",
      "min": 20,
      "max": 36,
      "step": "any",
      "unit": "lines"
    },
    {
      "key": "left",
      "label": "Left margin",
      "default": 1.0,
      "type": "number",
      "help": "",
      "min": 0.4,
      "max": 2,
      "step": "any",
      "unit": "in"
    },
    {
      "key": "right",
      "label": "Right margin",
      "default": 0.65,
      "type": "number",
      "help": "",
      "min": 0.4,
      "max": 2,
      "step": "any",
      "unit": "in"
    },
    {
      "key": "top",
      "label": "Top margin",
      "default": 0.8,
      "type": "number",
      "help": "",
      "min": 0.4,
      "max": 2,
      "step": "any",
      "unit": "in"
    },
    {
      "key": "bottom",
      "label": "Bottom margin",
      "default": 0.7,
      "type": "number",
      "help": "",
      "min": 0.4,
      "max": 2,
      "step": "any",
      "unit": "in"
    },
    {
      "key": "court",
      "label": "Court/jurisdiction label",
      "default": "California civil trial (illustrative)",
      "type": "text",
      "help": ""
    }
  ]
};
mount(config,calculate);
attachSpecial(config.id);

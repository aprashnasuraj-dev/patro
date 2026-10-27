import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0484",
  "name": "Tablecloth Size & Drop Calculator",
  "variant": "split",
  "tagline": "Plan fabric dimensions and edge drop",
  "action": "Size the tablecloth",
  "fields": [
    {
      "key": "shape",
      "label": "Table shape",
      "default": "Rectangle",
      "type": "select",
      "options": [
        "Rectangle",
        "Square",
        "Round"
      ],
      "help": ""
    },
    {
      "key": "unit",
      "label": "Measurement unit",
      "default": "in",
      "type": "select",
      "options": [
        "in",
        "cm"
      ],
      "help": ""
    },
    {
      "key": "length",
      "label": "Table length or diameter",
      "default": 72,
      "type": "number",
      "min": 1,
      "max": 2000,
      "step": "any",
      "unit": "",
      "help": ""
    },
    {
      "key": "width",
      "label": "Table width (for rectangle/square)",
      "default": 30,
      "type": "number",
      "min": 1,
      "max": 2000,
      "step": "any",
      "unit": "",
      "help": ""
    },
    {
      "key": "drop",
      "label": "Desired drape on each side",
      "default": 10,
      "type": "number",
      "min": 0,
      "max": 500,
      "step": "any",
      "unit": "",
      "help": ""
    },
    {
      "key": "height",
      "label": "Table height",
      "default": 30,
      "type": "number",
      "min": 1,
      "max": 1000,
      "step": "any",
      "unit": "",
      "help": ""
    }
  ]
};
mount(config,calculate);
import {installView} from './view';
installView();

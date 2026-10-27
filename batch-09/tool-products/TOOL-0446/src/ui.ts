import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
import {attachVisual} from '../_vendor/visual';
const config:Config={
  "id": "TOOL-0446",
  "name": "Label Sheet Template & Alignment Printer",
  "variant": "ledger",
  "tagline": "Printable label grid geometry and X/Y calibration",
  "action": "Lay out labels",
  "fields": [
    {
      "key": "sheetW",
      "label": "Sheet width",
      "default": 210,
      "type": "number",
      "help": "",
      "min": 20,
      "max": 1000,
      "step": "any",
      "unit": "mm"
    },
    {
      "key": "sheetH",
      "label": "Sheet height",
      "default": 297,
      "type": "number",
      "help": "",
      "min": 20,
      "max": 1000,
      "step": "any",
      "unit": "mm"
    },
    {
      "key": "cols",
      "label": "Label columns",
      "default": 3,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 30,
      "step": "any",
      "unit": ""
    },
    {
      "key": "rows",
      "label": "Label rows",
      "default": 8,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 40,
      "step": "any",
      "unit": ""
    },
    {
      "key": "labelW",
      "label": "One label width",
      "default": 63.5,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 500,
      "step": "any",
      "unit": "mm"
    },
    {
      "key": "labelH",
      "label": "One label height",
      "default": 33.9,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 500,
      "step": "any",
      "unit": "mm"
    },
    {
      "key": "left",
      "label": "Left margin",
      "default": 7,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 300,
      "step": "any",
      "unit": "mm"
    },
    {
      "key": "top",
      "label": "Top margin",
      "default": 12,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 300,
      "step": "any",
      "unit": "mm"
    },
    {
      "key": "gapX",
      "label": "Horizontal gap",
      "default": 2.5,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "mm"
    },
    {
      "key": "gapY",
      "label": "Vertical gap",
      "default": 0,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "mm"
    },
    {
      "key": "offsetX",
      "label": "Calibration x-offset",
      "default": 0,
      "type": "number",
      "help": "",
      "min": -20,
      "max": 20,
      "step": "any",
      "unit": "mm"
    },
    {
      "key": "offsetY",
      "label": "Calibration y-offset",
      "default": 0,
      "type": "number",
      "help": "",
      "min": -20,
      "max": 20,
      "step": "any",
      "unit": "mm"
    }
  ]
};
mount(config,calculate);
attachVisual(config.id,calculate);

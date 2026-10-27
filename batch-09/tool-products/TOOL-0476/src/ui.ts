import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
import {mountImageWorkbench} from './image-workbench';
const config:Config={
  "id": "TOOL-0476",
  "name": "Marketplace Image Resizer & Checker",
  "variant": "split",
  "tagline": "Local image dimensions and deterministic canvas export",
  "action": "Check output dimensions",
  "fields": [
    {
      "key": "maxPixels",
      "label": "Max decoded pixel budget",
      "default": 20000000,
      "type": "number",
      "help": "",
      "min": 1000000,
      "max": 40000000,
      "step": "any",
      "unit": "pixels"
    },
    {
      "key": "targetW",
      "label": "Target export width",
      "default": 1600,
      "type": "number",
      "help": "",
      "min": 64,
      "max": 8192,
      "step": "any",
      "unit": "px"
    },
    {
      "key": "targetH",
      "label": "Target export height",
      "default": 1600,
      "type": "number",
      "help": "",
      "min": 64,
      "max": 8192,
      "step": "any",
      "unit": "px"
    },
    {
      "key": "mode",
      "label": "Canvas fit",
      "default": "contain",
      "type": "select",
      "help": "",
      "options": [
        "contain",
        "cover"
      ]
    },
    {
      "key": "format",
      "label": "Output format",
      "default": "image/jpeg",
      "type": "select",
      "help": "",
      "options": [
        "image/jpeg",
        "image/png"
      ]
    }
  ]
};
mount(config,calculate);
mountImageWorkbench();

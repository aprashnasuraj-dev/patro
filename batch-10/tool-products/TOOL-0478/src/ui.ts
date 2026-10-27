import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
import {mountPdfCropper} from './pdf-workbench';
const config:Config={
  "id": "TOOL-0478",
  "name": "Shipping Label to 4x6 Thermal Cropper",
  "variant": "split",
  "tagline": "Private, in-browser 4×6-inch vector PDF crop",
  "action": "Validate PDF crop parameters",
  "fields": [
    {
      "key": "x",
      "label": "Crop left (PDF points)",
      "default": 0,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 3000,
      "step": "any",
      "unit": "pt"
    },
    {
      "key": "y",
      "label": "Crop bottom (PDF points)",
      "default": 0,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 3000,
      "step": "any",
      "unit": "pt"
    },
    {
      "key": "width",
      "label": "Source crop width",
      "default": 288,
      "type": "number",
      "help": "",
      "min": 36,
      "max": 3000,
      "step": "any",
      "unit": "pt"
    },
    {
      "key": "height",
      "label": "Source crop height",
      "default": 432,
      "type": "number",
      "help": "",
      "min": 54,
      "max": 4500,
      "step": "any",
      "unit": "pt"
    },
    {
      "key": "page",
      "label": "Source page, 1-based",
      "default": 1,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 100,
      "step": "any",
      "unit": "page"
    },
    {
      "key": "rotate",
      "label": "Orientation",
      "default": "portrait",
      "type": "select",
      "help": "",
      "options": [
        "portrait",
        "landscape"
      ]
    }
  ]
};
mount(config,calculate);
mountPdfCropper();

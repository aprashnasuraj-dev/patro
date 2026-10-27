import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
import {attachVisual} from '../_vendor/visual';
const config:Config={
  "id": "TOOL-0443",
  "name": "KDP/IngramSpark Spine Width & Cover Template",
  "variant": "compare",
  "tagline": "Wraparound cover width with publisher-specific restrictions",
  "action": "Estimate cover spread",
  "fields": [
    {
      "key": "provider",
      "label": "Printer",
      "default": "KDP",
      "type": "select",
      "help": "",
      "options": [
        "KDP",
        "IngramSpark — verified caliper"
      ]
    },
    {
      "key": "stock",
      "label": "KDP interior stock",
      "default": "white",
      "type": "select",
      "help": "",
      "options": [
        "white",
        "cream",
        "groundwood",
        "standard-color",
        "premium-color"
      ]
    },
    {
      "key": "pages",
      "label": "Final page count (even)",
      "default": 200,
      "type": "number",
      "help": "",
      "min": 24,
      "max": 1200,
      "step": "any",
      "unit": "pages"
    },
    {
      "key": "trimW",
      "label": "Trim width",
      "default": 6,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 12,
      "step": "any",
      "unit": "in"
    },
    {
      "key": "trimH",
      "label": "Trim height",
      "default": 9,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 15,
      "step": "any",
      "unit": "in"
    },
    {
      "key": "caliper",
      "label": "Verified spine caliper per page for IngramSpark",
      "default": 0.0025,
      "type": "number",
      "help": "",
      "min": 0.001,
      "max": 0.01,
      "step": "any",
      "unit": "in/page"
    },
    {
      "key": "bleed",
      "label": "Verified bleed on each outer edge",
      "default": 0.125,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 0.5,
      "step": "any",
      "unit": "in"
    }
  ]
};
mount(config,calculate);
attachVisual(config.id,calculate);

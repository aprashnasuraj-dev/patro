import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
import {attachVisual} from '../_vendor/visual';
const config:Config={
  "id": "TOOL-0441",
  "name": "Social Video Safe-Zone Overlay Previewer",
  "variant": "gauge",
  "tagline": "Preview placement overlays, not platform certification",
  "action": "Preview safe zone",
  "fields": [
    {
      "key": "platform",
      "label": "Guide profile",
      "default": "Custom",
      "type": "select",
      "help": "",
      "options": [
        "Custom",
        "YouTube Shorts illustrative",
        "Instagram/Facebook Reels illustrative",
        "TikTok illustrative"
      ]
    },
    {
      "key": "w",
      "label": "Canvas width",
      "default": 1080,
      "type": "number",
      "help": "",
      "min": 240,
      "max": 8192,
      "step": "any",
      "unit": "px"
    },
    {
      "key": "h",
      "label": "Canvas height",
      "default": 1920,
      "type": "number",
      "help": "",
      "min": 240,
      "max": 8192,
      "step": "any",
      "unit": "px"
    },
    {
      "key": "top",
      "label": "Reserved top",
      "default": 12,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 49,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "bottom",
      "label": "Reserved bottom",
      "default": 23,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 49,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "left",
      "label": "Reserved left",
      "default": 8,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 49,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "right",
      "label": "Reserved right",
      "default": 16,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 49,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "message",
      "label": "Preview caption",
      "default": "Headline appears here",
      "type": "text",
      "help": ""
    }
  ]
};
mount(config,calculate);
attachVisual(config.id,calculate);

import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0445",
  "name": "Video File Size & Bitrate Calculator",
  "variant": "compare",
  "tagline": "Estimate total bytes and reverse-engineer bitrate",
  "action": "Estimate file size",
  "fields": [
    {
      "key": "minutes",
      "label": "Duration minutes",
      "default": 12,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 50000,
      "step": "any",
      "unit": "min"
    },
    {
      "key": "seconds",
      "label": "Extra seconds",
      "default": 30,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 59.999,
      "step": "any",
      "unit": "s"
    },
    {
      "key": "videoMbps",
      "label": "Average encoded video bitrate",
      "default": 8,
      "type": "number",
      "help": "",
      "min": 0.001,
      "max": 5000,
      "step": "any",
      "unit": "Mb/s"
    },
    {
      "key": "audioKbps",
      "label": "Average total audio bitrate",
      "default": 192,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 5000,
      "step": "any",
      "unit": "kb/s"
    },
    {
      "key": "overhead",
      "label": "Estimated container overhead",
      "default": 2,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 30,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "targetMB",
      "label": "Target file size for reverse calculation",
      "default": 1000,
      "type": "number",
      "help": "",
      "min": 0.01,
      "max": 1000000000.0,
      "step": "any",
      "unit": "MB"
    }
  ]
};
mount(config,calculate);

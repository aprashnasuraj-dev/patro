import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0475",
  "name": "Marketplace Listing Length & Byte Checker",
  "variant": "gauge",
  "tagline": "UTF-8 bytes, Unicode code points and policy-bound character counts",
  "action": "Check listing length",
  "fields": [
    {
      "key": "platform",
      "label": "Marketplace policy source",
      "default": "Custom / verify product rules",
      "type": "text",
      "help": ""
    },
    {
      "key": "title",
      "label": "Listing title / description",
      "default": "Sample title",
      "type": "textarea",
      "help": ""
    },
    {
      "key": "limit",
      "label": "Verified field character cap (0 = none)",
      "default": 200,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100000,
      "step": "any",
      "unit": "chars"
    },
    {
      "key": "byteLimit",
      "label": "Verified UTF-8 byte cap (0 = none)",
      "default": 0,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100000,
      "step": "any",
      "unit": "bytes"
    }
  ]
};
mount(config,calculate);

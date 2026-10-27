import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0481",
  "name": "Tracking Number Carrier Identifier",
  "variant": "decoder",
  "tagline": "Pattern recognition, never shipment tracking",
  "action": "Identify possible carrier",
  "fields": [
    {
      "key": "number",
      "label": "Tracking reference",
      "default": "1Z999AA10123456784",
      "type": "text",
      "help": "Spaces and hyphens are removed; no tracking request is sent."
    }
  ]
};
mount(config,calculate);

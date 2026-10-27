import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0474",
  "name": "Tariff & Landed Cost Estimator",
  "variant": "ledger",
  "tagline": "Separate product value, duty, taxes and freight",
  "action": "Estimate landed cost",
  "fields": [
    {
      "key": "origin",
      "label": "Country of origin",
      "default": "Country of origin (verify)",
      "type": "text",
      "help": ""
    },
    {
      "key": "destination",
      "label": "Destination customs territory",
      "default": "Destination country (verify)",
      "type": "text",
      "help": ""
    },
    {
      "key": "value",
      "label": "Entered customs-assessable goods value",
      "default": 1000,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": "currency"
    },
    {
      "key": "freight",
      "label": "Freight cost",
      "default": 120,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": "currency"
    },
    {
      "key": "insurance",
      "label": "Insurance cost",
      "default": 20,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": "currency"
    },
    {
      "key": "duty",
      "label": "Verified effective ad valorem duty",
      "default": 10,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 300,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "tax",
      "label": "Verified consumption tax / VAT",
      "default": 5,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "taxFreight",
      "label": "Tax base includes freight + insurance",
      "default": "yes",
      "type": "select",
      "help": "",
      "options": [
        "yes",
        "no"
      ]
    },
    {
      "key": "fees",
      "label": "Brokerage and inspection fees",
      "default": 35,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": "currency"
    }
  ]
};
mount(config,calculate);

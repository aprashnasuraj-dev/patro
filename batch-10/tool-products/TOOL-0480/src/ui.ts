import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0480",
  "name": "1099-K Threshold Checker by State & Platform",
  "variant": "ledger",
  "tagline": "Federal TPSO reportability and one verified state overlay",
  "action": "Screen 1099-K reporting",
  "fields": [
    {
      "key": "year",
      "label": "Payment tax year",
      "default": 2026,
      "type": "number",
      "help": "",
      "min": 2025,
      "max": 2030,
      "step": "any",
      "unit": "year"
    },
    {
      "key": "type",
      "label": "Settlement channel",
      "default": "Third-party app or marketplace",
      "type": "select",
      "help": "",
      "options": [
        "Third-party app or marketplace",
        "Payment card acquiring entity"
      ]
    },
    {
      "key": "gross",
      "label": "Gross reportable goods/services payments",
      "default": 21000,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 10000000000.0,
      "step": "any",
      "unit": "USD"
    },
    {
      "key": "transactions",
      "label": "Reportable payment transactions",
      "default": 205,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 10000000,
      "step": "any",
      "unit": "count"
    },
    {
      "key": "state",
      "label": "Payee state",
      "default": "Other / not verified",
      "type": "select",
      "help": "",
      "options": [
        "Other / not verified",
        "Massachusetts"
      ]
    },
    {
      "key": "platform",
      "label": "Platform or payment app",
      "default": "Marketplace / app",
      "type": "text",
      "help": ""
    }
  ]
};
mount(config,calculate);

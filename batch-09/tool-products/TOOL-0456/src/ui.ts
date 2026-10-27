import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0456",
  "name": "Paid Family & Maternity Leave Pay Estimator",
  "variant": "ledger",
  "tagline": "Paid-leave wage replacement with state rules supplied by the user",
  "action": "Estimate leave benefits",
  "fields": [
    {
      "key": "program",
      "label": "Program / state (verify official 2026 rules)",
      "default": "User-verified program",
      "type": "text",
      "help": ""
    },
    {
      "key": "weekly",
      "label": "Average weekly eligible earnings",
      "default": 1200,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100000,
      "step": "any",
      "unit": "currency/week"
    },
    {
      "key": "rate",
      "label": "Confirmed replacement rate",
      "default": 65,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "cap",
      "label": "Confirmed maximum benefit per week",
      "default": 1000,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100000,
      "step": "any",
      "unit": "currency/week"
    },
    {
      "key": "weeks",
      "label": "Approved paid-leave weeks",
      "default": 10,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 52,
      "step": "any",
      "unit": "weeks"
    },
    {
      "key": "waiting",
      "label": "Unpaid waiting weeks under confirmed rule",
      "default": 0,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 8,
      "step": "any",
      "unit": "weeks"
    },
    {
      "key": "employerPay",
      "label": "Weekly employer supplement during paid weeks",
      "default": 0,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100000,
      "step": "any",
      "unit": "currency/week"
    }
  ]
};
mount(config,calculate);

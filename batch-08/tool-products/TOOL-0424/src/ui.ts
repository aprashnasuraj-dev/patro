import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
// Route-local field labels, examples and visual presentation are generated from the immutable tool allocation.
const config:Config={
  "id": "TOOL-0424",
  "name": "Security Deposit Return Deadline & Deduction Calculator",
  "variant": "timeline",
  "tagline": "Deposit return and itemized deduction worksheet",
  "action": "Check schedule",
  "fields": [
    {
      "key": "jurisdiction",
      "label": "State/province and rule",
      "default": "Local rule required",
      "type": "text",
      "help": ""
    },
    {
      "key": "deposit",
      "label": "Deposit amount received",
      "default": 1800,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "damage",
      "label": "Documented chargeable damage",
      "default": 150,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "arrears",
      "label": "Lawfully applicable unpaid rent",
      "default": 0,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "other",
      "label": "Other lawful deductions",
      "default": 0,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "days",
      "label": "Verified return deadline calendar days",
      "default": 30,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 366,
      "step": "any",
      "unit": ""
    },
    {
      "key": "trigger",
      "label": "Legally applicable trigger date",
      "default": "2026-11-01",
      "type": "date",
      "help": ""
    }
  ]
};
mount(config,calculate);

import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0460",
  "name": "FMLA Eligibility & Entitlement Calculator",
  "variant": "ledger",
  "tagline": "Federal FMLA threshold and remaining standard entitlement",
  "action": "Check FMLA baseline",
  "fields": [
    {
      "key": "covered",
      "label": "Covered employer under FMLA?",
      "default": "yes",
      "type": "select",
      "help": "",
      "options": [
        "yes",
        "no",
        "unknown"
      ]
    },
    {
      "key": "months",
      "label": "Counted months employed (including allowable nonconsecutive service)",
      "default": 18,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 600,
      "step": "any",
      "unit": "months"
    },
    {
      "key": "worked",
      "label": "Actual hours worked in prior 12 months",
      "default": 1600,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 10000,
      "step": "any",
      "unit": "hours"
    },
    {
      "key": "site",
      "label": "Employees within 75 miles of worksite",
      "default": 75,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 500000,
      "step": "any",
      "unit": "employees"
    },
    {
      "key": "normal",
      "label": "Employee normal hours per week",
      "default": 40,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 168,
      "step": "any",
      "unit": "h/week"
    },
    {
      "key": "used",
      "label": "Eligible FMLA workweek equivalents already used in selected 12-month period",
      "default": 3,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 12,
      "step": "any",
      "unit": "workweeks"
    },
    {
      "key": "special",
      "label": "Special covered classification / qualifying military caregiver?",
      "default": "standard",
      "type": "select",
      "help": "",
      "options": [
        "standard",
        "airline-crew",
        "military-caregiver",
        "other-special"
      ]
    }
  ]
};
mount(config,calculate);

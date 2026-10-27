import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0458",
  "name": "State Overtime & Fluctuating Workweek Calculator",
  "variant": "ledger",
  "tagline": "Federal overtime comparison and conditional FWW half-time",
  "action": "Model weekly pay",
  "fields": [
    {
      "key": "mode",
      "label": "Pay structure",
      "default": "hourly",
      "type": "select",
      "help": "",
      "options": [
        "hourly",
        "fluctuating-week"
      ]
    },
    {
      "key": "hours",
      "label": "Hours actually worked in one 168-hour workweek",
      "default": 48,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 168,
      "step": "any",
      "unit": "hours"
    },
    {
      "key": "rate",
      "label": "Straight hourly wage (hourly mode)",
      "default": 25,
      "type": "number",
      "help": "",
      "min": 0.01,
      "max": 100000,
      "step": "any",
      "unit": "currency/hour"
    },
    {
      "key": "fixed",
      "label": "Fixed weekly salary for all hours (FWW)",
      "default": 950,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 10000000.0,
      "step": "any",
      "unit": "currency"
    },
    {
      "key": "bonus",
      "label": "Non-excludable incentive pay that week",
      "default": 0,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 10000000.0,
      "step": "any",
      "unit": "currency"
    },
    {
      "key": "min",
      "label": "Verified applicable minimum hourly wage",
      "default": 7.25,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000,
      "step": "any",
      "unit": "currency/hour"
    },
    {
      "key": "fwwOK",
      "label": "FWW prerequisites separately reviewed",
      "default": "no",
      "type": "select",
      "help": "",
      "options": [
        "no",
        "yes"
      ]
    }
  ]
};
mount(config,calculate);

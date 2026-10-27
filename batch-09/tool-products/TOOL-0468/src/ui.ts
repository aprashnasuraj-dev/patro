import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0468",
  "name": "Continuing Education Credit & License Renewal Tracker",
  "variant": "gauge",
  "tagline": "Credits remaining and on-time earning feasibility",
  "action": "Track CE credits",
  "fields": [
    {
      "key": "jurisdiction",
      "label": "Licensing board / state",
      "default": "Verified licensing board",
      "type": "text",
      "help": ""
    },
    {
      "key": "target",
      "label": "Verified period credit requirement",
      "default": 30,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 10000,
      "step": "any",
      "unit": "credits"
    },
    {
      "key": "earned",
      "label": "Accepted credits in this period",
      "default": 12,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 10000,
      "step": "any",
      "unit": "credits"
    },
    {
      "key": "renewal",
      "label": "Renewal deadline",
      "default": "2027-06-30",
      "type": "date",
      "help": ""
    },
    {
      "key": "asof",
      "label": "Tracking date",
      "default": "2026-10-26",
      "type": "date",
      "help": ""
    },
    {
      "key": "monthly",
      "label": "Realistically planned credits per month",
      "default": 3,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000,
      "step": "any",
      "unit": "credits"
    }
  ]
};
mount(config,calculate);

import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0472",
  "name": "Trade Licence Hours Tracker by State",
  "variant": "ledger",
  "tagline": "Verified trade-license apprenticeship hour ledger",
  "action": "Summarize trade hours",
  "fields": [
    {
      "key": "state",
      "label": "State / trade / board",
      "default": "State electrician board (verify)",
      "type": "text",
      "help": ""
    },
    {
      "key": "required",
      "label": "Verified qualifying hour requirement",
      "default": 8000,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 40000,
      "step": "any",
      "unit": "hours"
    },
    {
      "key": "logged",
      "label": "Hours already formally accepted",
      "default": 6000,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 40000,
      "step": "any",
      "unit": "hours"
    },
    {
      "key": "entries",
      "label": "New dated qualifying hours: YYYY-MM-DD,hours,type",
      "default": "2026-10-01,8,field\n2026-10-02,6,classroom",
      "type": "textarea",
      "help": ""
    },
    {
      "key": "dailyCap",
      "label": "Maximum modeled daily count (verify policy)",
      "default": 16,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 24,
      "step": "any",
      "unit": "hours"
    }
  ]
};
mount(config,calculate);

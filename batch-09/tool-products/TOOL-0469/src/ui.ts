import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0469",
  "name": "Supervised Driving Log by State",
  "variant": "gauge",
  "tagline": "Auditable daytime and nighttime supervised driving totals",
  "action": "Review driving sessions",
  "fields": [
    {
      "key": "state",
      "label": "State and permit class (requirements verified separately)",
      "default": "State / class",
      "type": "text",
      "help": ""
    },
    {
      "key": "target",
      "label": "Verified required supervised hours",
      "default": 50,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000,
      "step": "any",
      "unit": "hours"
    },
    {
      "key": "nightTarget",
      "label": "Verified required night hours",
      "default": 10,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 500,
      "step": "any",
      "unit": "hours"
    },
    {
      "key": "sessions",
      "label": "Sessions: YYYY-MM-DD,minutes,night_minutes",
      "default": "2026-09-01,90,30\n2026-09-02,120,0",
      "type": "textarea",
      "help": ""
    }
  ]
};
mount(config,calculate);

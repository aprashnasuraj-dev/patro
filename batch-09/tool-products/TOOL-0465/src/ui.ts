import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0465",
  "name": "International GPA Converter",
  "variant": "ledger",
  "tagline": "Transparent grade-point model, not automatic credential equivalence",
  "action": "Compute weighted GPA",
  "fields": [
    {
      "key": "system",
      "label": "Entered grading scheme",
      "default": "4.0 course-point entries",
      "type": "select",
      "help": "",
      "options": [
        "4.0 course-point entries",
        "Percentage via verified mapping"
      ]
    },
    {
      "key": "data",
      "label": "Courses as title|credits|score (4.0 points or percentage)",
      "default": "Math|3|3.7\nScience|4|3.3",
      "type": "textarea",
      "help": ""
    },
    {
      "key": "map",
      "label": "Verified percentage lower-bound:points bands",
      "default": "90:4,80:3,70:2,60:1,0:0",
      "type": "text",
      "help": "Only used in percentage mode. Descending percent thresholds ending at 0."
    },
    {
      "key": "scale",
      "label": "Transcript scale maximum",
      "default": 4,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 20,
      "step": "any",
      "unit": "points"
    }
  ]
};
mount(config,calculate);

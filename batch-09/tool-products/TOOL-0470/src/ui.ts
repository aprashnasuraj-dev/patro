import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0470",
  "name": "Transcript & GPA Builder",
  "variant": "ledger",
  "tagline": "Homeschool transcript rows, credits and GPA",
  "action": "Build transcript totals",
  "fields": [
    {
      "key": "student",
      "label": "Student name",
      "default": "Student Example",
      "type": "text",
      "help": ""
    },
    {
      "key": "grad",
      "label": "Expected graduation year",
      "default": 2027,
      "type": "number",
      "help": "",
      "min": 1900,
      "max": 2100,
      "step": "any",
      "unit": "year"
    },
    {
      "key": "courses",
      "label": "Course|credits|letter|year",
      "default": "Algebra II|1|A|2025\nBiology|1|B+|2025",
      "type": "textarea",
      "help": ""
    },
    {
      "key": "honors",
      "label": "Add verified honors boost",
      "default": "off",
      "type": "select",
      "help": "",
      "options": [
        "off",
        "add 0.5 to designated H courses"
      ]
    }
  ]
};
mount(config,calculate);

import {attach} from './visual';
import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0466",
  "name": "SAT/ACT Superscore & College Policy Checker",
  "variant": "compare",
  "tagline": "Best-section SAT or enhanced ACT composite, with policy verification",
  "action": "Compute superscore",
  "fields": [
    {
      "key": "exam",
      "label": "Exam format",
      "default": "SAT",
      "type": "select",
      "help": "",
      "options": [
        "SAT",
        "ACT enhanced 2025+"
      ]
    },
    {
      "key": "attempts",
      "label": "Attempts separated by lines: SAT RW,Math or ACT English,Math,Reading",
      "default": "650,700\n720,680",
      "type": "textarea",
      "help": ""
    },
    {
      "key": "school",
      "label": "College / program to check",
      "default": "Specific admissions office",
      "type": "text",
      "help": ""
    },
    {
      "key": "policy",
      "label": "User-verified college policy",
      "default": "Unknown — must verify",
      "type": "select",
      "help": "",
      "options": [
        "Unknown — must verify",
        "Superscore accepted (verified)",
        "Best single sitting only (verified)"
      ]
    }
  ]
};
mount(config,calculate);

attach();

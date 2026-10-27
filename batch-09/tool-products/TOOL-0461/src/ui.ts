import {attach} from './visual';
import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0461",
  "name": "TRIR/DART Calculator with BLS Industry Benchmarks",
  "variant": "compare",
  "tagline": "Separate total-recordable and DART rates with a documented benchmark",
  "action": "Calculate TRIR and DART",
  "fields": [
    {
      "key": "hours",
      "label": "Employee hours actually worked in period",
      "default": 200000,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 1000000000.0,
      "step": "any",
      "unit": "hours"
    },
    {
      "key": "recordable",
      "label": "OSHA total recordable cases",
      "default": 5,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000.0,
      "step": "any",
      "unit": "cases"
    },
    {
      "key": "dart",
      "label": "Cases with days away, restrictions or transfers",
      "default": 3,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000.0,
      "step": "any",
      "unit": "cases"
    },
    {
      "key": "benchmark",
      "label": "Benchmark scope",
      "default": "2024 US private industry aggregate",
      "type": "select",
      "help": "",
      "options": [
        "2024 US private industry aggregate",
        "Custom verified industry benchmark"
      ]
    },
    {
      "key": "industry",
      "label": "NAICS industry / comparable population if custom",
      "default": "",
      "type": "text",
      "help": ""
    },
    {
      "key": "blsTRIR",
      "label": "Verified comparable benchmark TRIR",
      "default": 2.3,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000,
      "step": "any",
      "unit": ""
    },
    {
      "key": "blsDART",
      "label": "Verified comparable benchmark DART",
      "default": 1.4,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000,
      "step": "any",
      "unit": ""
    }
  ]
};
mount(config,calculate);

attach();

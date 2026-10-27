import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0450",
  "name": "Dog & Cat Food Portion and Cost Calculator by Brand",
  "variant": "ledger",
  "tagline": "Label-sourced feeding portions and bag cost",
  "action": "Calculate feeding plan",
  "fields": [
    {
      "key": "species",
      "label": "Species",
      "default": "dog",
      "type": "select",
      "help": "",
      "options": [
        "dog",
        "cat"
      ]
    },
    {
      "key": "brand",
      "label": "Brand and formula on food label",
      "default": "Example Adult Maintenance",
      "type": "text",
      "help": ""
    },
    {
      "key": "calories",
      "label": "Calories from package label",
      "default": 360,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 10000,
      "step": "any",
      "unit": "kcal/cup"
    },
    {
      "key": "gramsPerCup",
      "label": "Measured grams per cup",
      "default": 100,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 1000,
      "step": "any",
      "unit": "g/cup"
    },
    {
      "key": "dailyKcal",
      "label": "Daily kcal advised for this animal",
      "default": 540,
      "type": "number",
      "help": "",
      "min": 1,
      "max": 10000,
      "step": "any",
      "unit": "kcal/day"
    },
    {
      "key": "bagKg",
      "label": "Bag/tub net weight",
      "default": 2.5,
      "type": "number",
      "help": "",
      "min": 0.01,
      "max": 200,
      "step": "any",
      "unit": "kg"
    },
    {
      "key": "bagCost",
      "label": "Price per bag",
      "default": 30,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 10000,
      "step": "any",
      "unit": "currency"
    },
    {
      "key": "treatPct",
      "label": "Daily calories from treats / other food",
      "default": 10,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 50,
      "step": "any",
      "unit": "%"
    }
  ]
};
mount(config,calculate);

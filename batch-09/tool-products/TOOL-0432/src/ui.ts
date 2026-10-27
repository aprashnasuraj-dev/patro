import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
// Route-local field labels, examples and visual presentation are generated from the immutable tool allocation.
const config:Config={
  "id": "TOOL-0432",
  "name": "Fair Roommate Rent Splitter",
  "variant": "split",
  "tagline": "Split an apartment fairly",
  "action": "Split rent",
  "fields": [
    {
      "key": "rent",
      "label": "Total monthly rent",
      "default": 3000,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 1000000000.0,
      "step": "any",
      "unit": ""
    },
    {
      "key": "commonSharePct",
      "label": "Rent share attributed to shared areas",
      "default": 40,
      "type": "number",
      "help": "",
      "min": 0,
      "max": 100,
      "step": "any",
      "unit": "%"
    },
    {
      "key": "rooms",
      "label": "Roommates: name, private ft², signed amenity adjustment per month (JSON)",
      "default": "[{\"name\":\"A\",\"sqft\":150,\"adjustment\":100},{\"name\":\"B\",\"sqft\":120,\"adjustment\":0},{\"name\":\"C\",\"sqft\":100,\"adjustment\":-100}]",
      "type": "textarea",
      "help": ""
    }
  ]
};
mount(config,calculate);

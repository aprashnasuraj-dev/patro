import {mount} from '../_vendor/ui';
import type {Config} from '../_vendor/ui';
import {calculate} from './core';
const config:Config={
  "id": "TOOL-0464",
  "name": "Data Access Request Letter Generator",
  "variant": "ledger",
  "tagline": "Privacy-conscious personal data access letter draft",
  "action": "Draft access request",
  "fields": [
    {
      "key": "basis",
      "label": "Legal basis",
      "default": "EU GDPR Article 15",
      "type": "select",
      "help": "",
      "options": [
        "EU GDPR Article 15",
        "UK personal data request",
        "General voluntary request"
      ]
    },
    {
      "key": "name",
      "label": "Requester name",
      "default": "Alex Example",
      "type": "text",
      "help": ""
    },
    {
      "key": "recipient",
      "label": "Organization / controller",
      "default": "Example Company Data Protection Team",
      "type": "text",
      "help": ""
    },
    {
      "key": "contact",
      "label": "Requester reply email",
      "default": "alex@example.test",
      "type": "text",
      "help": ""
    },
    {
      "key": "scope",
      "label": "Records or processing to include",
      "default": "Account profile and purchase history",
      "type": "text",
      "help": ""
    }
  ]
};
mount(config,calculate);

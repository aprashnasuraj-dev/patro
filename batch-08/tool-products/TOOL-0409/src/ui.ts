import {mountTool} from "../_vendor/ui";
import {calculate} from "./core";
import "../_vendor/styles.css";
import "./styles.css";
mountTool({
  fields:[{"name":"wallLengthFt","label":"Wall length (ft)","type":"number","value":20,"min":0.1,"max":500},{"name":"wallHeightFt","label":"Stud cut height target (in)","type":"number","value":92.625,"min":1,"max":240},{"name":"spacingIn","label":"Stud spacing o.c. (in)","type":"number","value":16,"min":6,"max":48},{"name":"openings","label":"Rough openings, one width×height per line (in)","type":"textarea","value":"36x82\n60x48","placeholder":"36x82"}],
  compute:calculate,
  resultTitle:"Stud Wall Layout & Cut List Generator results"
});

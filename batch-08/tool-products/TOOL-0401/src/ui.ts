import {mountTool} from "../_vendor/ui";
import {calculate} from "./core";
import "../_vendor/styles.css";
import "./styles.css";
mountTool({
  fields:[{"name":"count","label":"Number of posts","type":"number","value":10,"min":1,"max":1000,"step":1},{"name":"holeDiameterIn","label":"Hole diameter (in)","type":"number","value":12,"min":1,"max":120},{"name":"holeDepthIn","label":"Hole depth (in)","type":"number","value":36,"min":1,"max":240},{"name":"postShape","label":"Post cross-section","type":"select","value":"square","options":[{"value":"square","label":"Square"},{"value":"round","label":"Round"}]},{"name":"postSizeIn","label":"Post width / diameter (in)","type":"number","value":4,"min":0,"max":48},{"name":"bagYieldFt3","label":"Concrete yield per bag (ft³)","type":"number","value":0.6,"min":0.01,"max":10,"step":0.01,"help":"Use the yield printed on your bag."},{"name":"wastePct","label":"Waste / spillage (%)","type":"number","value":8,"min":0,"max":100}],
  compute:calculate,
  resultTitle:"Fence & Deck Post Concrete Calculator results"
});

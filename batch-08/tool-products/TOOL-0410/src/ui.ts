import {mountTool} from "../_vendor/ui";
import {calculate} from "./core";
import "../_vendor/styles.css";
import "./styles.css";
mountTool({
  fields:[{"name":"areaSqFt","label":"Paved area (ft²)","type":"number","value":300,"min":0.01,"max":1000000},{"name":"paverLengthIn","label":"Paver length (in)","type":"number","value":8,"min":0.1,"max":120},{"name":"paverWidthIn","label":"Paver width (in)","type":"number","value":4,"min":0.1,"max":120},{"name":"baseDepthIn","label":"Compacted base depth (in)","type":"number","value":6,"min":0,"max":48},{"name":"beddingDepthIn","label":"Bedding sand depth (in)","type":"number","value":1,"min":0,"max":12},{"name":"jointSandLbPer100SqFt","label":"Polymeric sand coverage (lb / 100 ft²)","type":"number","value":30,"min":0,"max":1000,"help":"Use the bag manufacturer's coverage for your joint width/depth."},{"name":"wastePct","label":"Paver waste (%)","type":"number","value":7,"min":0,"max":100}],
  compute:calculate,
  resultTitle:"Paver, Base & Polymeric Sand Calculator results"
});

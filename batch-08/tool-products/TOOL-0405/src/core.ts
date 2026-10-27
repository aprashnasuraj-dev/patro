import {finite,round} from "../_vendor/validation";
const rad=(d:number)=>d*Math.PI/180, deg=(r:number)=>r*180/Math.PI;
export function calculate(i:any){
 const S=finite("Spring angle",i.springDeg,0.1,89.9), C=finite("Included corner",i.cornerDeg,1,179);
 const m=deg(Math.atan(Math.sin(rad(S))/Math.tan(rad(C/2))));
 const b=deg(Math.asin(Math.cos(rad(S))*Math.cos(rad(C/2))));
 const nested=(180-C)/2;
 return {"Flat-on-table miter setting":round(m,2)+"°","Flat-on-table bevel setting":round(b,2)+"°","Nested miter magnitude":round(nested,2)+"°",
 "Orientation note":"Inside/outside corners use the same angle magnitudes but opposite piece orientation. Test on scrap before cutting finish stock."}
}

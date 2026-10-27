import {finite,round} from "../_vendor/validation";
export function calculate(i:any){
 const filmIn=finite("Inside film R",i.insideFilmR,0,20), filmOut=finite("Outside film R",i.outsideFilmR,0,20), continuous=finite("Continuous layers R",i.continuousR,0,200);
 const cavity=finite("Cavity path R",i.cavityR,0.01,200), framing=finite("Framing path R",i.framingR,0.01,200), frac=finite("Framing fraction",i.framingPct,0,100)/100;
 const common=filmIn+filmOut+continuous, Rc=common+cavity, Rf=common+framing;
 const U=(1-frac)/Rc+frac/Rf, R=1/U;
 return {"Cavity-path R":round(Rc,3),"Framing-path R":round(Rf,3),"Assembly U-factor":round(U,4),"Effective assembly R":round(R,2),
 "Method":"Parallel-path area-weighted conductance; not a whole-building energy-code compliance calculation."}
}

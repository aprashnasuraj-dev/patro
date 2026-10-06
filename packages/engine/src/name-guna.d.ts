export interface NameProfile {
  name:string;
  syllable:string;
  nakshatraIndex:number;
  nakshatraEn:string;
  nakshatraNe:string;
  pada:number;
  moonLongitude:number;
  signIndex:number;
  signNe:string;
}
export interface NameGunaItem { key:string; label:string; score:number; max:number; detail:string; }
export interface NameGunaResult {
  total:number;
  max:number;
  verdict:string;
  mode:"name";
  items:NameGunaItem[];
  profileA:NameProfile;
  profileB:NameProfile;
}
export function profileFromName(name:string):NameProfile;
export function calculateNameGuna(nameA:string,nameB:string):NameGunaResult;
export function nameSyllableFromNakshatra(nakshatraIndex:number,pada:number):string;

export type MediaKind = "radio" | "tv";

export interface MediaItem {
  id: string;
  kind: MediaKind;
  name: string;
  nameNe: string;
  streamUrl: string;
  province: string;
  district: string;
  genre: string;
  codec: string;
  bitrateKbps?: number;
  logo?: string;
  officialUrl?: string;
  scheduleUrl?: string;
}

export const RADIO_STATIONS: MediaItem[] = [
  {
    id:"radio-kantipur",kind:"radio",name:"Radio Kantipur",nameNe:"रेडियो कान्तिपुर",
    streamUrl:"https://radio-broadcast.ekantipur.com/stream",province:"Bagmati",district:"Lalitpur",
    genre:"News · Music",codec:"MP3",bitrateKbps:128,officialUrl:"https://radiokantipur.com/",scheduleUrl:"https://radiokantipur.com/"
  },
  {
    id:"hits-fm",kind:"radio",name:"Hits FM 91.2",nameNe:"हिट्स एफएम",
    streamUrl:"https://usa15.fastcast4u.com/proxy/hitsfm912?mp=/1",province:"Bagmati",district:"Kathmandu",
    genre:"Music · Entertainment",codec:"MP3",bitrateKbps:64,officialUrl:"https://hitsfm.com.np/"
  },
  {
    id:"ujyaalo",kind:"radio",name:"Ujyaalo 90 Network",nameNe:"उज्यालो ९० नेटवर्क",
    streamUrl:"http://stream.zenolive.com/wtuvp08xq1duv",province:"Bagmati",district:"Kathmandu",
    genre:"News · Talk",codec:"MP3",bitrateKbps:112,officialUrl:"https://ujyaaloonline.com/"
  },
  {
    id:"kalika-fm",kind:"radio",name:"Kalika FM 95.2",nameNe:"कालिका एफएम",
    streamUrl:"https://streaming.softnep.net:10828/stream",province:"Bagmati",district:"Chitwan",
    genre:"Music · News",codec:"MP3",bitrateKbps:128,officialUrl:"https://kalikafm.com/"
  },
  {
    id:"cin-khabar",kind:"radio",name:"CIN Khabar",nameNe:"सीआईएन खबर",
    streamUrl:"https://streaming.softnep.net:10996/;stream.mp3",province:"Bagmati",district:"Kathmandu",
    genre:"News · Community",codec:"AAC+",bitrateKbps:48,officialUrl:"https://www.cin.org.np/"
  },
  {
    id:"bbc-nepali",kind:"radio",name:"BBC Nepali",nameNe:"बीबीसी नेपाली",
    streamUrl:"https://stream.live.vc.bbcmedia.co.uk/bbc_nepali_radio",province:"International",district:"London",
    genre:"News",codec:"MP3",bitrateKbps:56,officialUrl:"https://www.bbc.com/nepali"
  }
];

export const TV_CHANNELS: MediaItem[] = [
  {
    id:"kantipur-tv",kind:"tv",name:"Kantipur TV HD",nameNe:"कान्तिपुर टिभी एचडी",
    streamUrl:"https://ktvhdsg.ekantipur.com:8443/high_quality_85840165/hd/playlist.m3u8",province:"Bagmati",district:"Kathmandu",
    genre:"News · Entertainment",codec:"HLS",officialUrl:"https://kantipurtv.com/live",scheduleUrl:"https://kantipurtv.com/live"
  },
  {
    id:"ntv",kind:"tv",name:"Nepal Television",nameNe:"नेपाल टेलिभिजन",
    streamUrl:"http://202.166.207.67:1935/live/ntv/playlist.m3u8",province:"Bagmati",district:"Kathmandu",
    genre:"National · General",codec:"HLS",officialUrl:"https://nepaltvonline.com/"
  },
  {
    id:"ntv-news",kind:"tv",name:"NTV News",nameNe:"एनटिभी न्यूज",
    streamUrl:"http://202.166.207.67:1935/live/ntvnews/playlist.m3u8",province:"Bagmati",district:"Kathmandu",
    genre:"News",codec:"HLS",officialUrl:"https://nepaltvonline.com/"
  },
  {
    id:"ntv-plus",kind:"tv",name:"NTV Plus",nameNe:"एनटिभी प्लस",
    streamUrl:"http://202.166.207.67:1935/live/ntvplus/playlist.m3u8",province:"Bagmati",district:"Kathmandu",
    genre:"Entertainment · Sports",codec:"HLS",officialUrl:"https://nepaltvonline.com/"
  },
  {
    id:"ap1",kind:"tv",name:"AP1 HD",nameNe:"एपीवान एचडी",
    streamUrl:"http://202.166.207.67:1935/live/ap1/playlist.m3u8",province:"Bagmati",district:"Kathmandu",
    genre:"News · Entertainment",codec:"HLS",officialUrl:"https://ap1hd.com/"
  },
  {
    id:"himalaya-tv",kind:"tv",name:"Himalaya TV HD",nameNe:"हिमालय टिभी एचडी",
    streamUrl:"http://202.166.207.67:1935/live/himalaya/playlist.m3u8",province:"Bagmati",district:"Kathmandu",
    genre:"Entertainment",codec:"HLS",officialUrl:"https://himalayatv.com/"
  }
];

export const MEDIA_CATALOG = [...RADIO_STATIONS,...TV_CHANNELS];

export function fuzzyMedia(items: MediaItem[], query: string) {
  const terms=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if(!terms.length) return items;
  return items.map((item)=>{
    const hay=[item.name,item.nameNe,item.province,item.district,item.genre].join(" ").toLocaleLowerCase();
    const score=terms.reduce((sum,term)=>{
      if(hay.startsWith(term)) return sum+6;
      const index=hay.indexOf(term);
      return sum+(index>=0?Math.max(1,5-Math.floor(index/14)):0);
    },0);
    return {item,score};
  }).filter((x)=>x.score>0).sort((a,b)=>b.score-a.score).map((x)=>x.item);
}

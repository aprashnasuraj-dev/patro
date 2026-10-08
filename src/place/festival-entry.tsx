import { createRoot } from 'react-dom/client';
import { readPlace } from './place';
import { PlaceTimingMount } from './PlaceTimingMount';
// Do not alter DOM or load astronomy with no saved location.
if(readPlace()) { const host=document.createElement('div');host.id='patro-local-festival';document.querySelector('main')?.append(host);const date=document.querySelector<HTMLAnchorElement>('a[href^="/date/"]')?.getAttribute('href')?.slice(6);createRoot(host).render(<PlaceTimingMount path={location.pathname} date={date}/>); }

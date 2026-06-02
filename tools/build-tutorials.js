#!/usr/bin/env node
/* eslint-disable */
// Standalone tutorials builder for the DATA repo. Pulls Minecraft build-tutorial
// videos from open, key-free YouTube RSS feeds and writes ./tutorials.json.
// Run by the daily GitHub Action (update-tutorials.yml) — fully automatic.
const fs = require('fs');
const path = require('path');

const HANDLES = [
  'Zaypixel', 'Goldrobin', 'Rizzial', 'Spudetti', 'disruptivebuilds',
  'Heyimrobby', 'itsmeJulian', 'Cortezerino', 'Greg_Builds', 'SmykMC',
  'folli', 'BlewVureKraft', 'Bedotia', 'RaiseYourDongersOP',
];
const PER_CHANNEL = 8, MAX_TOTAL = 80;
const UA = { 'User-Agent': 'Mozilla/5.0 (CraftMaster tutorials)' };

async function text(url){const r=await fetch(url,{headers:UA});if(!r.ok)throw new Error('HTTP '+r.status);return r.text();}
async function resolveChannelId(h){try{const html=await text('https://www.youtube.com/@'+h);const m=html.match(/channel\/(UC[A-Za-z0-9_-]{22})/);return m?m[1]:null;}catch{return null;}}
function decode(s){return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#x27;/g,"'");}
function parseFeed(xml){const channel=(xml.match(/<title>([\s\S]*?)<\/title>/)||[])[1]||'';const items=[];const entries=xml.match(/<entry>([\s\S]*?)<\/entry>/g)||[];for(const e of entries){const id=(e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)||[])[1];const title=(e.match(/<title>([\s\S]*?)<\/title>/)||[])[1];const published=(e.match(/<published>([^<]+)<\/published>/)||[])[1];if(!id||!title)continue;items.push({id,title:decode(title),channel:decode(channel),image:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`,url:`https://www.youtube.com/watch?v=${id}`,published:published||''});}return items;}
const BUILD_RE=/(build|house|base|tutorial|how to|mansion|castle|design|interior|starter|cottage|farm|statue|megabuild|aesthetic|decor)/i;

async function main(){
  let all=[];
  for(const h of HANDLES){
    const cid=await resolveChannelId(h); if(!cid){console.log('skip @'+h);continue;}
    try{const xml=await text('https://www.youtube.com/feeds/videos.xml?channel_id='+cid);let items=parseFeed(xml).filter(v=>BUILD_RE.test(v.title)).slice(0,PER_CHANNEL);console.log('@'+h+' -> '+items.length);all=all.concat(items);}catch(e){console.log('@'+h+' failed '+e.message);}
  }
  const seen=new Set();all=all.filter(v=>seen.has(v.id)?false:seen.add(v.id));
  all.sort((a,b)=>(b.published||'').localeCompare(a.published||''));all=all.slice(0,MAX_TOTAL);
  const payload={meta:{generatedAt:new Date().toISOString(),count:all.length,source:'youtube-rss'},items:all};
  fs.writeFileSync(path.join(__dirname,'..','tutorials.json'),JSON.stringify(payload));
  console.log('wrote tutorials.json with '+all.length+' items');
}
main().catch(e=>{console.error(e);process.exit(1);});

// Process Greenhouse API responses: filter, dedup, output candidates.
import fs from 'node:fs';
import path from 'node:path';

const positive = ["Analytics Engineer","Analytics Engineering","Data Analyst","Data Visualization Engineer","Analytics","dbt","Business Intelligence","BI Engineer","Data Platform","Data Infrastructure","Metrics","Data Modeling","Applied AI","AI Solutions","LLM","GenAI","Generative AI","Data Science","Product Analyst","Product Data","Business Analyst","Data Scientist"];
const negative = ["Manager","Director","Head of","VP","Chief","Junior","Intern","Entry",".NET","Java ","iOS","Android","PHP","Ruby","Embedded","Firmware","FPGA","ASIC","Blockchain","Web3","Crypto","Salesforce Admin","SAP ","COBOL","Front End","Frontend","Software Engineer","Software Development Engineer","Software Engineering","Software Developer","Data Engineer","Data Engineering","ML Engineer","Machine Learning Engineer","AI Engineer","MLOps","Platform Engineer","Infrastructure Engineer","Backend Engineer","Backend Software","Full Stack","Fullstack","Site Reliability","SRE","DevOps","Cloud Engineer","Security Engineer","Network Engineer","Systems Engineer","Hardware Engineer","Firmware Engineer","Thermal Engineer","Electrical Engineer","Mechanical Engineer","Aircraft","Avionics","QA Analyst","QA Engineer","Quality Assurance","Compliance Analyst","Sales Operations","Revenue Operations","Financial Analyst","Finance Analyst","FP&A","Credit Analyst","Program Finance","Content Analyst","Research Analyst","Talent Acquisition","Customer Success","Support Analyst","Support Engineer","Fulfillment","Pharmacist","Psychologist","Therapist","Mental Health","Designer","Creative Director","Copywriter","Account Executive","Account Manager","Partner Manager","Solutions Architect","Solutions Engineer","Sales Engineer","Development Representative","Business Development","Go-to-Market","GTM","Deal Desk","Implementation Analyst","Onboarding Analyst","Marketing Operations","Marketing Analyst","Campaign Ops","Entitlements Analyst","Collections Analyst","Order Management","Compensation Analyst","Revenue Accounting","Accounting Analyst","Strategy Analyst","Credit Strategy","Fraud Strategy","Research Scientist","Machine Learning Scientist","ML Scientist","Computer Vision","Safety Data Scientist","Safety Analyst","Maintenance Engineer","Technician","Operator","Recruiter","Paralegal","Legal Operations","Services Operations","Fleet Planning","Workforce Strategy","Partnerships","Deal Support","Billing","AR Analyst","Procurement","Privacy Analyst","Service Desk","HRIS","People Technology","People Operations","People Analytics","Benefits Analyst","Tax Analyst","Regulatory Affairs","Vendor Security","Security Analyst","Security Operations","Credit Operations","Loan Operations","Payments Integrity","Retail Operations","Operations Associate","Game Test","Web Developer","Client Partner","Powertrain","Air Segment"];

function titleOk(title){
  const t = title.toLowerCase();
  if(!positive.some(k=>t.includes(k.toLowerCase()))) return false;
  if(negative.some(k=>t.includes(k.toLowerCase()))) return false;
  return true;
}

function locationRemoteUS(loc){
  if(!loc) return null; // unknown - keep but flag
  const l = loc.toLowerCase();
  // hard non-US
  const nonUS = ['india','bangalore','bengaluru','delhi','mumbai','hyderabad','pune','london','dublin','berlin','paris','amsterdam','sao paulo','são paulo','mexico','canada','toronto','vancouver','barcelona','madrid','warsaw','tel aviv','sydney','melbourne','tokyo','singapore','hong kong','manila','philippines','vietnam','colombia','argentina','brazil','japan','germany','france','spain','netherlands','poland','israel','australia','china','korea','uk','united kingdom','ireland','italy','sweden','denmark','norway','finland','switzerland','portugal','romania','bulgaria','greece','austria','belgium','czech','hungary','ukraine'];
  if(nonUS.some(k=>l.includes(k))) return false;
  // remote / US indicators
  const remote = ['remote','united states','usa','u.s.','anywhere'];
  if(remote.some(k=>l.includes(k))) return true;
  // explicit US states - assume non-remote unless "remote" word appears
  return null; // ambiguous
}

const TMP = process.env.SCAN_TMP || 'c:/Users/ericc/AppData/Local/Temp/career-ops-scan';
const seen = new Set(fs.readFileSync(path.join(TMP,'seen.txt'),'utf-8').split(/\r?\n/).map(s=>s.trim()).filter(Boolean));

// Load applications.md company+role
const apps = fs.readFileSync('data/applications.md','utf-8');
const appPairs = new Set();
for(const line of apps.split('\n')){
  const cols = line.split('|').map(s=>s.trim());
  if(cols.length>=6 && cols[4] && cols[5]){
    const company = cols[4].toLowerCase().replace(/[^a-z0-9]/g,'');
    const role = cols[5].toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,30);
    if(company && role) appPairs.add(company+'|'+role);
  }
}

// Load pipeline URLs
const pipe = fs.readFileSync('data/pipeline.md','utf-8');
const pipeUrls = new Set();
for(const m of pipe.matchAll(/https?:\/\/\S+/g)) pipeUrls.add(m[0].replace(/[)\]]+$/,''));

const apiDir = path.join(TMP,'api');
const slugCompany = {
  anthropic:'Anthropic',hex:'Hex',hubspotjobs:'HubSpot',samsara:'Samsara',checkr:'Checkr',duolingo:'Duolingo',
  carta:'Carta',mixpanel:'Mixpanel',reddit:'Reddit',dbtlabsinc:'dbt Labs',databricks:'Databricks',fivetran:'Fivetran',
  noom:'Noom',airtable:'Airtable',sonyinteractiveentertainmentglobal:'PlayStation Global (SIE)',oura:'Oura',
  roku:'Roku',headspace:'Headspace',grafanalabs:'Grafana Labs',calm:'Calm',coinbase:'Coinbase',block:'Block',
  amplitude:'Amplitude',hatchcareers:'Hatch',vercel:'Vercel',hightouch:'Hightouch',mercury:'Mercury',webflow:'Webflow',
  twilio:'Twilio',octus:'Octus',seed:'Seed',northbeam:'Northbeam',fleetio:'Fleetio',splice:'Splice',
  tripadvisor:'Tripadvisor',alma:'Alma',okta:'Okta',cribl:'Cribl',alphasense:'AlphaSense',goatgroup:'GOAT Group',
  babylist:'Babylist',carrotfertility:'Carrot Fertility',brex:'Brex',lattice:'Lattice',retool:'Retool',
  patientpoint:'PatientPoint',smithrx:'SmithRx',smarterdx:'SmarterDx',engine:'Engine',life360:'Life360',
  weedmaps77:'Weedmaps',cordial:'Cordial',lithic:'Lithic',springhealth66:'Spring Health',
  simplepractice55:'SimplePractice',toast:'Toast',dropbox:'Dropbox',angi:'Angi',fetchrewards:'Fetch',
  earnest:'Earnest',mavenclinic:'Maven Clinic',paperlesspost:'Paperless Post',axon:'Axon',huntress:'Huntress',
  pinterest:'Pinterest',gitlab:'GitLab',capitalrx:'Capital Rx',rightwayhealthcare:'Rightway',
  transcarent:'Transcarent',truepill:'Truepill',komodohealth:'Komodo Health',innovaccer:'Innovaccer',
  coherehealth:'Cohere Health',ramp:'Ramp',vanta:'Vanta',notion:'Notion',future:'Future',
  fanaticsfbg:'Fanatics',onxmaps:'onX Maps',andurilindustries:'Anduril Industries',
  trueanomalyinc:'True Anomaly',strava:'Strava'
};

const candidates = [];
const stats = {filtered_title:0, dup_seen:0, dup_pipe:0, dup_app:0, non_remote_us:0, found:0, total_jobs:0, by_company:{}};

for(const file of fs.readdirSync(apiDir)){
  const slug = file.replace('.json','');
  if(slug==='upstart') continue; // blocklisted
  let data;
  try{ data = JSON.parse(fs.readFileSync(path.join(apiDir,file),'utf-8')); }catch{continue;}
  if(!data.jobs) continue;
  const company = slugCompany[slug] || slug;
  for(const job of data.jobs){
    stats.total_jobs++;
    const title = job.title || '';
    const url = job.absolute_url;
    const loc = job.location?.name || '';
    if(!titleOk(title)){ stats.filtered_title++; continue; }
    if(seen.has(url)){ stats.dup_seen++; continue; }
    if(pipeUrls.has(url)){ stats.dup_pipe++; continue; }
    const ck = company.toLowerCase().replace(/[^a-z0-9]/g,'');
    const rk = title.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,30);
    if(appPairs.has(ck+'|'+rk)){ stats.dup_app++; continue; }
    const remote = locationRemoteUS(loc);
    if(remote===false){ stats.non_remote_us++;
      // record skip in scan-history
      candidates.push({company,title,url,loc,skip:'non_remote_us'});
      continue;
    }
    candidates.push({company,title,url,loc,skip:null,ambiguous:remote===null});
    stats.found++;
    stats.by_company[company]=(stats.by_company[company]||0)+1;
  }
}

fs.writeFileSync(path.join(TMP,'candidates.json'), JSON.stringify(candidates,null,2));
console.log(JSON.stringify(stats,null,2));
console.log('\nCandidates:');
for(const c of candidates.filter(x=>!x.skip)){
  console.log(`  + ${c.company} | ${c.title} | ${c.loc}${c.ambiguous?' [LOC?]':''}`);
  console.log(`    ${c.url}`);
}

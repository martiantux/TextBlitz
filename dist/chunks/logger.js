class r{constructor(){this.logs=[],this.debugMode=!1,this.maxLogs=30,this.initialized=!1,this.sessionId=`session-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,this.loadFromStorage()}static getInstance(){return r.instance||(r.instance=new r),r.instance}setDebugMode(t){this.debugMode=t}async loadFromStorage(){if(!this.initialized)try{const t=await chrome.storage.local.get("logBuffer");t.logBuffer&&Array.isArray(t.logBuffer)&&(this.logs=t.logBuffer.slice(-this.maxLogs)),this.initialized=!0}catch(t){console.error("TextBlitz: Failed to load logs from storage",t),this.initialized=!0}}async saveToStorage(){try{await chrome.storage.local.set({logBuffer:this.logs.slice(-this.maxLogs)})}catch{}}addLog(t){t.context||(t.context={}),t.context.sessionId=this.sessionId;const e=this.sanitizeLogEntry(t);this.logs.push(e),this.logs.length>this.maxLogs&&(this.logs=this.logs.slice(-this.maxLogs)),this.saveToStorage()}sanitizeLogEntry(t){const e={...t};return e.context&&(e.context=this.sanitizeContext(e.context)),e}sanitizeContext(t){const e={...t};if(e.site?.url)try{const s=new URL(e.site.url);e.site.url=`${s.protocol}//${s.hostname}${s.pathname}`}catch{e.site.url="[INVALID_URL]"}return e.error&&(e.error=this.sanitizeString(e.error)),e}sanitizeString(t){return/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(t)&&(t=t.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,"[EMAIL]")),/^(Bearer|sk-|gsk_|sk-ant-|AI)[a-zA-Z0-9_-]{20,}/.test(t)?"[TOKEN]":/^[a-zA-Z0-9_-]{32,}$/.test(t)?"[KEY]":t.length>500?t.substring(0,500)+"...[truncated]":t}info(t,e,s){const n={level:"info",category:t,message:e,context:s,timestamp:Date.now()};this.addLog(n),this.debugMode&&console.log(`TextBlitz [${t}]:`,e,s||"")}warn(t,e,s){const n={level:"warn",category:t,message:e,context:s,timestamp:Date.now()};this.addLog(n),this.debugMode&&console.warn(`TextBlitz [${t}]:`,e,s||"")}error(t,e,s){const n={level:"error",category:t,message:e,context:s,timestamp:Date.now()};this.addLog(n),console.error(`TextBlitz [${t}]:`,e,s||"")}debug(t,e,s){const n={level:"debug",category:t,message:e,context:s,timestamp:Date.now()};this.addLog(n),this.debugMode&&console.log(`TextBlitz [${t}] DEBUG:`,e,s||"")}getElementContext(t){return{tag:t.tagName,type:t instanceof HTMLInputElement?t.type:void 0,id:t.id||void 0,classes:t.className||void 0,contentEditable:t.isContentEditable}}getSiteContext(){return{hostname:window.location.hostname,url:window.location.href}}getRecentLogs(t=50){return this.logs.slice(-t)}getLogsByCategory(t){return this.logs.filter(e=>e.category===t)}getErrors(){return this.logs.filter(t=>t.level==="error")}getLogsPreview(){if(this.logs.length===0)return"No logs recorded yet.";let t="";return this.logs.forEach((e,s)=>{const n=new Date(e.timestamp).toLocaleTimeString();t+=`${s+1}. [${n}] ${e.level.toUpperCase()} - ${e.category}: ${e.message}
`}),t}formatForGitHub(t=!1,e){const s=this.getErrors(),n=this.getRecentLogs(30);let i=`## 🐛 Bug Report

`;i+=`**Session ID:** ${this.sessionId}
`,i+=`**Timestamp:** ${new Date().toISOString()}
`;try{i+=`**Extension Version:** ${chrome.runtime.getManifest().version}
`}catch{i+=`**Extension Version:** Unknown
`}return i+=`**Browser:** ${navigator.userAgent}

`,s.length>0&&(i+=`### ❌ Errors

`,s.forEach((o,a)=>{const l=new Date(o.timestamp).toLocaleTimeString();i+=`${a+1}. **[${l}] ${o.category}**: ${o.message}
`,o.context&&(i+=`   <details>
   <summary>Details</summary>

   \`\`\`json
   ${JSON.stringify(o.context,null,2)}
   \`\`\`
   </details>

`)})),i+=`<details>
<summary>📋 Last 30 Log Entries</summary>

\`\`\`
`,n.forEach(o=>{const a=new Date(o.timestamp).toLocaleTimeString();i+=`[${a}] ${o.level.padEnd(5)} | ${o.category.padEnd(10)} | ${o.message}
`}),i+="```\n</details>\n\n",t&&e&&(i+=`<details>
<summary>📝 Snippet Details</summary>

\`\`\`json
`,i+=JSON.stringify(e,null,2),i+=`
\`\`\`
</details>

`),i}clearLogs(){this.logs=[]}}const g=r.getInstance();export{g as l};

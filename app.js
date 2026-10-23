// === TEMPO APP ===
// Main entry point — modules are loaded via <script> tags in index.html
// See modules/ directory for individual screen implementations

init();
setupCloseWarning();

// Чат поддержки на нейросети отложен (см. docs/ai-chat-demo.md).
// У тех, кто успел скачать модель, она занимает ~640 МБ в хранилище браузера — удаляем.
setTimeout(async()=>{
  try{const ks=await caches.keys();await Promise.all(ks.filter(k=>k.startsWith('tempo-ai')).map(k=>caches.delete(k)));}catch(e){}
  try{
    const dir=await(await navigator.storage.getDirectory()).getDirectoryHandle('cache');
    for(const n of['tempo-qwen35-0.8b-q6k-v1.gguf','__metadata__tempo-qwen35-0.8b-q6k-v1.gguf']){try{await dir.removeEntry(n);}catch(e){}}
  }catch(e){}
},3000);

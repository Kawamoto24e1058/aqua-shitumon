<script>
  import { fade, slide } from 'svelte/transition';
</script>

<svelte:head>
  <title>Dev Dashboard | Aqua Shitumon</title>
  <script src="https://cdn.tailwindcss.com"></script>
</svelte:head>

<main class="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-white font-sans">
  <div class="max-w-xl w-full" in:fade>
    <div class="text-center mb-12">
      <h1 class="text-4xl font-black mb-4 bg-gradient-to-r from-blue-400 to-teal-300 bg-clip-text text-transparent italic">
        AQUA SHITUMON
      </h1>
      <p class="text-slate-400 font-medium">開発用インデックス（URL迷子防止用）</p>
    </div>

    <div class="space-y-4">
      <a 
        href="/post" 
        class="group flex items-center justify-between p-6 bg-slate-800 border border-slate-700 rounded-3xl hover:bg-slate-700 transition-all active:scale-95 shadow-lg"
        in:slide={{ delay: 100 }}
      >
        <div>
          <div class="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">Public</div>
          <div class="text-xl font-bold">投稿画面 (/post)</div>
        </div>
        <span class="text-2xl group-hover:translate-x-2 transition-transform">🌊</span>
      </a>

      <a 
        href="/aqua-live-stage-70th" 
        class="group flex items-center justify-between p-6 bg-slate-800 border border-slate-700 rounded-3xl hover:bg-slate-700 transition-all active:scale-95 shadow-lg"
        in:slide={{ delay: 200 }}
      >
        <div>
          <div class="text-xs font-black text-teal-400 uppercase tracking-widest mb-1">Secret (Viewer)</div>
          <div class="text-xl font-bold">ステージ画面 (/aqua-live-stage-70th)</div>
        </div>
        <span class="text-2xl group-hover:translate-x-2 transition-transform">🐟</span>
      </a>

      <a 
        href="/secret-admin-mgr-panel" 
        class="group flex items-center justify-between p-6 bg-slate-800 border border-slate-700 rounded-3xl hover:bg-slate-700 transition-all active:scale-95 shadow-lg"
        in:slide={{ delay: 300 }}
      >
        <div>
          <div class="text-xs font-black text-rose-400 uppercase tracking-widest mb-1">Secret (Manager)</div>
          <div class="text-xl font-bold">管理者画面 (/secret-admin-mgr-panel)</div>
        </div>
        <span class="text-2xl group-hover:translate-x-2 transition-transform">🛠️</span>
      </a>
    </div>

    <p class="mt-12 text-slate-600 text-xs text-center border-t border-slate-800 pt-8">
      ※ 本番環境では、一般ユーザーには /post のみを開示してください。
    </p>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    background: #0f172a;
  }
</style>


<script>
  import { db } from '$lib/firebase';
  import { 
    collection, 
    onSnapshot, 
    doc, 
    setDoc, 
    deleteDoc,
    query, 
    orderBy,
    updateDoc,
    serverTimestamp as firestoreTimestamp
  } from 'firebase/firestore';
  import { fade, slide } from 'svelte/transition';

  /** @type {any[]} */
  let allQuestions = [];
  /** @type {any[]} */
  let candidates = [];
  let currentOnStage = "";
  let isProcessing = false;

  // 1. Listen to all questions
  const q = query(collection(db, 'questions'), orderBy('timestamp', 'desc'));
  onSnapshot(q, (snapshot) => {
    allQuestions = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      // Format timestamp for display
      displayTime: doc.data().timestamp?.toDate()?.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) || '---'
    }));
  });

  $: poolQuestions = allQuestions.filter(q => q.status === 'pending' || !q.status);

  // 2. Listen to current display state
  const displayDoc = doc(db, 'appState', 'currentDisplay');
  onSnapshot(displayDoc, (snapshot) => {
    if (snapshot.exists()) {
      currentOnStage = snapshot.data().text || "";
    } else {
      currentOnStage = "";
    }
  });

  function drawCandidates() {
    if (poolQuestions.length === 0) return;
    const shuffled = [...poolQuestions].sort(() => 0.5 - Math.random());
    candidates = shuffled.slice(0, 3);
  }

  /** @param {any} question */
  async function showOnStage(question) {
    if (isProcessing) return;
    try {
      isProcessing = true;
      
      // Update display state
      await setDoc(displayDoc, { 
        id: question.id,
        text: question.text,
        nickname: question.nickname || "",
        updatedAt: new Date()
      }, { merge: true });

      // Update status instead of deleting to keep history
      await updateDoc(doc(db, 'questions', question.id), {
        status: 'picked',
        pickedAt: firestoreTimestamp()
      });
      
      // Clear candidates
      candidates = [];
    } catch (err) {
      console.error(err);
      alert("エラーが発生しました");
    } finally {
      isProcessing = false;
    }
  }

  async function resetDisplay() {
    try {
      await setDoc(displayDoc, { text: "" }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  }
</script>

<svelte:head>
  <title>管理パネル | ガイダンス質問</title>
  <script src="https://cdn.tailwindcss.com"></script>
</svelte:head>

<main class="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans">
  <div class="max-w-4xl mx-auto">
    <header class="flex justify-between items-center mb-12 border-b border-slate-800 pb-6">
      <div>
        <h1 class="text-3xl font-black tracking-tighter text-blue-400">GUIDANCE QUESTION</h1>
        <p class="text-slate-500 text-sm mt-1">ガイダンス質問 管理パネル</p>
      </div>
      <div class="text-right">
        <div class="text-xs font-bold text-slate-500 uppercase tracking-widest">現在のプール</div>
        <div class="text-2xl font-black text-white">{poolQuestions.length} <span class="text-sm font-normal text-slate-500">件</span></div>
      </div>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Left: Controls -->
      <section class="space-y-6">
        <div class="bg-slate-800/50 border border-slate-700 rounded-3xl p-8 backdrop-blur-xl">
          <h2 class="text-xl font-bold mb-6 flex items-center">
            <span class="w-2 h-6 bg-blue-500 rounded-full mr-3"></span>
            候補を選ぶ
          </h2>
          
          <button 
            on:click={drawCandidates}
            class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
            disabled={poolQuestions.length === 0}
          >
            ランダムに3つ選ぶ 🎲
          </button>

          {#if candidates.length > 0}
            <div class="mt-8 space-y-4" in:slide>
              {#each candidates as c}
                <div class="p-5 bg-slate-900/60 border border-slate-700 hover:border-blue-500/50 rounded-2xl transition-all group shadow-sm">
                  <div class="flex justify-between items-center mb-3">
                    <div class="flex flex-col">
                      <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Student ID</span>
                      <span class="text-sm font-black text-white">{c.student_id || 'UNKNOWN'}</span>
                    </div>
                    <div class="text-right">
                      <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Nickname</span>
                      <span class="text-xs font-bold text-blue-400">@{c.nickname || 'anon'}</span>
                    </div>
                  </div>
                  <div class="bg-slate-800/50 p-3 rounded-xl mb-4 border border-slate-700/50">
                    <p class="text-sm font-medium leading-relaxed">{c.text}</p>
                  </div>
                  <button 
                    on:click={() => showOnStage(c)}
                    class="w-full py-3 bg-blue-600/20 hover:bg-green-600 text-green-400 hover:text-white text-[10px] font-black rounded-xl transition-all uppercase tracking-widest border border-green-500/20"
                    disabled={isProcessing}
                  >
                    ステージに投影 ➔
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </section>

      <!-- Right: Status -->
      <section class="space-y-6">
        <div class="bg-slate-800/50 border border-slate-700 rounded-3xl p-8 backdrop-blur-xl">
          <h2 class="text-xl font-bold mb-6 flex items-center">
            <span class="w-2 h-6 bg-green-500 rounded-full mr-3"></span>
            ステージの投影状態
          </h2>

          {#if currentOnStage}
            <div class="p-6 bg-slate-900 border-2 border-green-500/30 rounded-2xl mb-6 shadow-pill" in:fade>
              <div class="text-xs font-black text-green-400 uppercase mb-2 tracking-widest animate-pulse">On Stage Now</div>
              <p class="text-lg font-bold leading-relaxed">{currentOnStage}</p>
            </div>
            <button 
              on:click={resetDisplay}
              class="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold py-4 rounded-2xl transition-all"
            >
              表示を消す（リセット）
            </button>
          {:else}
            <div class="p-12 border-2 border-dashed border-slate-700 rounded-2xl text-center">
              <p class="text-slate-500 font-medium">現在、投影中の質問はありません</p>
            </div>
          {/if}
        </div>

        <div class="bg-slate-800/20 border border-slate-800 rounded-3xl p-6">
          <h3 class="text-sm font-bold text-slate-500 mb-4 uppercase tracking-widest">全質問リスト（モデレーション）</h3>
          <div class="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {#each poolQuestions as q}
              <div class="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/30 flex justify-between items-center group hover:bg-slate-800/60 transition-all">
                <div class="flex-1 mr-4">
                  <div class="flex items-center gap-3 mb-2">
                    <div class="px-2 py-0.5 bg-slate-900 rounded text-[9px] font-black text-blue-400 border border-blue-900/50">
                      ID: {q.student_id || '---'}
                    </div>
                    <span class="text-[10px] font-bold text-slate-400">@{q.nickname || 'anon'}</span>
                  </div>
                  <p class="text-xs text-slate-200 leading-relaxed font-medium">{q.text}</p>
                </div>
                <!-- Immediate Delete for Moderation -->
                <button 
                  on:click={() => { if(confirm('完全に削除しますか？')) deleteDoc(doc(db, 'questions', q.id)) }}
                  class="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all opacity-0 group-hover:opacity-100 border border-red-500/20"
                  title="不適切な質問を消去"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            {/each}
          </div>
        </div>
      </section>
    </div>

    <!-- Full History Roster Section -->
    <section class="mt-12 bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
      <div class="bg-slate-50 border-b border-slate-200 px-8 py-6 flex justify-between items-center">
        <div>
          <h2 class="text-xl font-black text-slate-900">全投稿データ（運営用）</h2>
          <p class="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">Complete Submission Roster</p>
        </div>
        <div class="px-4 py-2 bg-slate-200 rounded-full text-xs font-black text-slate-700">
          TOTAL: {allQuestions.length}
        </div>
      </div>
      
      <div class="max-h-[600px] overflow-y-auto custom-scrollbar-light">
        <table class="w-full text-left border-collapse">
          <thead class="sticky top-0 bg-slate-50 shadow-sm z-10">
            <tr>
              <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">時間</th>
              <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">学籍番号</th>
              <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">ニックネーム</th>
              <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">質問内容</th>
              <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">状態</th>
              <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-900">
            {#each allQuestions as q}
              <tr class="hover:bg-blue-50/30 transition-colors">
                <td class="px-6 py-4 text-xs font-mono text-slate-400 whitespace-nowrap">{q.displayTime}</td>
                <td class="px-6 py-4 text-sm font-black tracking-tight">{q.student_id || '---'}</td>
                <td class="px-6 py-4 text-sm font-black text-blue-600">@{q.nickname || 'anon'}</td>
                <td class="px-6 py-4 text-sm font-medium leading-relaxed max-w-md">{q.text}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  {#if q.status === 'picked'}
                    <span class="px-2 py-1 bg-green-100 text-green-700 text-[9px] font-black rounded-md uppercase">Picked</span>
                  {:else if q.status === 'deleted'}
                    <span class="px-2 py-1 bg-red-100 text-red-700 text-[9px] font-black rounded-md uppercase">Deleted</span>
                  {:else}
                    <span class="px-2 py-1 bg-blue-100 text-blue-700 text-[9px] font-black rounded-md uppercase">Pending</span>
                  {/if}
                </td>
                <td class="px-6 py-4 text-right">
                  <button 
                    on:click={() => { if(confirm('本当にこの投稿を完全に削除しますか？\n(名簿からも消去されます)')) deleteDoc(doc(db, 'questions', q.id)) }}
                    class="p-2 text-red-300 hover:text-red-600 transition-colors"
                    title="名簿から完全に削除"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  </div>
</main>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #334155;
    border-radius: 10px;
  }
  
  .custom-scrollbar-light::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar-light::-webkit-scrollbar-track {
    background: #f8fafc;
  }
  .custom-scrollbar-light::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
  }
  .custom-scrollbar-light::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
</style>

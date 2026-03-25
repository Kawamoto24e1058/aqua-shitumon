<script>
  import { db } from '$lib/firebase';
  import { 
    collection, 
    onSnapshot, 
    doc, 
    setDoc, 
    deleteDoc, 
    query, 
    orderBy 
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
    allQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });

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
    if (allQuestions.length === 0) return;
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
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

      // Remove from pool
      await deleteDoc(doc(db, 'questions', question.id));
      
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
        <div class="text-2xl font-black text-white">{allQuestions.length} <span class="text-sm font-normal text-slate-500">件</span></div>
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
            disabled={allQuestions.length === 0}
          >
            ランダムに3つ選ぶ 🎲
          </button>

          {#if candidates.length > 0}
            <div class="mt-8 space-y-4" in:slide>
              {#each candidates as c}
                <div class="p-4 bg-slate-900/50 border border-slate-700 rounded-2xl hover:border-blue-500/50 transition-colors group">
                  <div class="flex justify-between items-start mb-2">
                    <span class="text-xs font-bold text-blue-400">@{c.nickname || 'ななし'}</span>
                  </div>
                  <p class="text-sm font-medium leading-relaxed mb-4">{c.text}</p>
                  <button 
                    on:click={() => showOnStage(c)}
                    class="w-full py-2 bg-slate-700 hover:bg-green-600 text-white text-xs font-black rounded-lg transition-colors uppercase tracking-widest"
                    disabled={isProcessing}
                  >
                    ステージに出す ➔
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
            {#each allQuestions as q}
              <div class="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 flex justify-between items-center group">
                <div class="flex-1 mr-4">
                  <div class="flex items-center mb-1">
                    <span class="text-[10px] font-black text-slate-500 uppercase tracking-tighter mr-2">@{q.nickname || 'anon'}</span>
                  </div>
                  <p class="text-xs text-slate-300 leading-relaxed">{q.text}</p>
                </div>
                <button 
                  on:click={() => deleteDoc(doc(db, 'questions', q.id))}
                  class="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
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
</style>

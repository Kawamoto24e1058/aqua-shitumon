<script>
  import { db } from '$lib/firebase';
  import { collection, addDoc, serverTimestamp, terminate } from 'firebase/firestore';
  import { fade } from 'svelte/transition';

  let nickname = '';
  let text = '';
  let isSending = false;
  let notice = '';
  let error = '';

  function resetForm() {
    nickname = '';
    text = '';
    isSending = false;
    error = '';
  }

  async function handleSubmit() {
    if (!nickname || !text) {
      error = 'すべて入力してください';
      return;
    }
    
    isSending = true;
    error = '';
    notice = '';
    
    try {
      // 1. Save to Firestore
      await addDoc(collection(db, 'questions'), {
        nickname,
        text,
        timestamp: serverTimestamp()
      });
      
      // 2. Clear only text for continuous submission
      text = '';
      notice = '質問を送信しました！続けて質問できます 📨';
      
      // Clear notice after 5 seconds
      setTimeout(() => {
        notice = '';
      }, 5000);
      
    } catch (e) {
      console.error('Error submitting:', e);
      error = '送信に失敗しました。時間をおいて再度お試しください。';
    } finally {
      isSending = false;
    }
  }
</script>

<svelte:head>
  <title>質問を送信 | ガイダンス質問</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;900&display=swap" rel="stylesheet">
</svelte:head>

<main class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
  <div class="w-full max-w-lg">
    <div class="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 md:p-12 border border-white/20">
      <h1 class="text-4xl font-black text-blue-900 mb-8 text-center tracking-tight" style="font-family: 'Noto Sans JP', sans-serif;">
        ガイダンス質問
      </h1>

      {#if notice}
        <div class="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl flex items-center justify-center font-bold text-sm animate-bounce" in:fade>
          {notice}
        </div>
      {/if}

      {#if error}
        <div class="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl flex items-center justify-center font-bold text-sm">
          {error}
        </div>
      {/if}

      <form on:submit|preventDefault={handleSubmit} class="space-y-6">
        <div>
          <label for="nickname" class="block text-xs font-bold text-blue-800 uppercase tracking-widest mb-2 ml-1">
            ニックネーム
          </label>
          <input
            id="nickname"
            type="text"
            bind:value={nickname}
            placeholder="なまえ"
            class="w-full px-6 py-4 bg-white/50 border-2 border-blue-100 rounded-2xl focus:border-blue-400 focus:ring-0 outline-none transition-all placeholder:text-blue-200 text-blue-900 font-medium"
            disabled={isSending}
            required
          />
        </div>

        <div>
          <label for="text" class="block text-xs font-bold text-blue-800 uppercase tracking-widest mb-2 ml-1">
            質問内容
          </label>
          <textarea
            id="text"
            bind:value={text}
            placeholder="どんなことでも聞いてね"
            rows="4"
            class="w-full px-6 py-4 bg-white/50 border-2 border-blue-100 rounded-2xl focus:border-blue-400 focus:ring-0 outline-none transition-all placeholder:text-blue-200 text-blue-900 font-medium resize-none"
            disabled={isSending}
            required
          ></textarea>
        </div>

        <button
          type="submit"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 text-lg flex items-center justify-center space-x-2"
          disabled={isSending}
        >
          {#if isSending}
            <span>送信中...</span>
          {:else}
            <span>質問を送信する 📨</span>
          {/if}
        </button>
      </form>
    </div>
  </div>
</main>

<style>
  /* Local styles if needed, Tailwind handles most things */
  :global(body) {
    background: linear-gradient(to bottom, #001f3f 0%, #000c1e 100%);
  }
</style>

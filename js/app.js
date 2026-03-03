/**
* CyberQuran - Professional Recitation System (V2.1)
* النسخة المعتمدة والمطابقة لقاعدة البيانات المستخرجة
*/
'use strict';

// --- 1. إدارة الحالة (State Management) ---
const State = {
  currentSurah: null,
  words: [],
  cursor: 0,
  isListening: false,
  recognition: null,
  restartTimeout: null
};

// --- 2. عناصر الواجهة (DOM Elements) ---
const DOM = {
  screenHome: document.getElementById('screen-home'),
  screenRecite: document.getElementById('screen-recite'),
  surahNameDisplay: document.getElementById('surah-name-display'),
  statusDot: document.getElementById('status-dot'),
  statusText: document.getElementById('status-text'),
  quranTextContent: document.getElementById('quran-text-content'),
  speechInterim: document.getElementById('speech-interim'),
  btnRecite: document.getElementById('btn-recite'),
  btnDelete: document.getElementById('btn-delete'),
  surahListModal: document.getElementById('surah-list-modal'),
  surahListContainer: document.getElementById('surah-list-container'),
  toast: document.getElementById('toast-msg')
};

// --- 3. معالجة النصوص (التطبيع للمحرك الصوتي فقط) ---
function normalizeArabic(text) {
  if (!text) return '';
  return text
  .replace(/[\u064B-\u065F\u0670\u06d6-\u06ed]/g, '') // إزالة التشكيل ورموز الوقف
  .replace(/[أإآ]/g, 'ا') // توحيد الألف
  .replace(/ة/g, 'ه') // توحيد التاء المربوطة
  .replace(/ى/g, 'ي') // توحيد الياء
  .replace(/\s+/g, ' ') // تنظيف المسافات
  .trim();
}

// --- 4. محرك الصوت الاحترافي (Speech Core) ---
function initSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    showToast("المتصفح لا يدعم تقنية التعرف على الصوت");
    return;
  }

  if (!State.recognition) {
    State.recognition = new SpeechRecognition();
    State.recognition.lang = 'ar-SA';
    State.recognition.continuous = true;
    State.recognition.interimResults = true;

    State.recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          processSpoken(normalizeArabic(transcript));
        } else {
          interimTranscript += transcript;
        }
      }
      if (interimTranscript) {
        DOM.speechInterim.textContent = interimTranscript;
      }
    };

    State.recognition.onend = () => {
      if (State.isListening) {
        clearTimeout(State.restartTimeout);
        State.restartTimeout = setTimeout(() => {
          try {
            State.recognition.start();
          } catch (e) {}
        }, 100);
      } else {
        DOM.speechInterim.textContent = '···';
        DOM.statusDot.className = 'dot-idle';
      }
    };

    State.recognition.onerror = (e) => {
      if (e.error === 'no-speech') return;
      console.error("Speech Error:", e.error);
    };
  }
}

function processSpoken(text) {
  const inputWords = text.split(/\s+/);
  inputWords.forEach(sw => {
    if (State.cursor < State.words.length) {
      const currentTarget = State.words[State.cursor];
      // المقارنة تتم مع النص المُنظف (match)
      if (normalizeArabic(sw) === currentTarget.match) {
        revealWord(State.cursor, 'voice');
        State.cursor++;
      }
    }
  });
}

// --- 5. التحكم بالواجهة (UI Actions) ---
function toggleRecognition() {
  if (!State.recognition) initSpeech();

  if (State.isListening) {
    State.isListening = false;
    State.recognition.stop();
    DOM.btnRecite.classList.remove('btn-recite-active');
    DOM.statusText.textContent = "جاهز";
    DOM.statusDot.className = 'dot-idle';
  } else {
    if (State.words.length === 0) return showToast("اختر سورة أولاً");
    State.isListening = true;
    try {
      State.recognition.start();
      DOM.btnRecite.classList.add('btn-recite-active');
      DOM.statusText.textContent = "يسمع...";
      DOM.statusDot.className = 'dot-listening';
    } catch (e) {
      console.error(e);
    }
  }
}

// --- 6. عرض السور وإدارة البيانات (التعديل لإظهار التشكيل) ---
function buildSurahDisplay(surahData) {
  State.words = [];
  State.cursor = 0;
  DOM.quranTextContent.innerHTML = '';
  const fragment = document.createDocumentFragment();

  surahData.ayahs.forEach(ayah => {
    ayah.words.forEach(wordObj => {
      const span = document.createElement('span');
      span.className = 'word-hidden';

      // ✅ نستخدم wordObj.display ليعرض النص المشكل الأصلي
      span.textContent = wordObj.display;

      State.words.push({
        element: span,
        // ✅ نستخدم wordObj.match للمطابقة الصوتية المخفية
        match: wordObj.match
      });

      fragment.appendChild(span);
      fragment.appendChild(document.createTextNode(' '));
    });

    const ayahNum = document.createElement('span');
    ayahNum.className = 'ayah-number';
    ayahNum.textContent = ` (${ayah.number}) `;
    fragment.appendChild(ayahNum);
  });

  DOM.quranTextContent.appendChild(fragment);
  DOM.quranTextContent.scrollTop = 0;
}

async function loadSurah(surahMeta) {
  try {
    const response = await fetch(`./data/${surahMeta.file}`);
    if (!response.ok) throw new Error();
    return await response.json();
  } catch (err) {
    showToast("تعذر تحميل ملف السورة");
    return null;
  }
}

// --- 7. الوظائف المساعدة (Helpers) ---
function revealWord(index, mode) {
  if (index >= State.words.length) return;
  const word = State.words[index];
  word.element.className = (mode === 'voice') ? 'word-revealed-voice': 'word-revealed-hint';
  word.element.scrollIntoView({
    behavior: 'smooth', block: 'center'
  });
}

function revealNextWord() {
  revealWord(State.cursor, 'hint');
  State.cursor++;
}

function deleteLast() {
  if (State.cursor <= 0) return;
  State.cursor--;
  State.words[State.cursor].element.className = 'word-hidden';
}

// الحذف المطول
let deleteInterval;
DOM.btnDelete.addEventListener('touchstart', (e) => {
  e.preventDefault();
  deleteLast();
  deleteInterval = setInterval(deleteLast, 150);
});
const clearInt = () => clearInterval(deleteInterval);
DOM.btnDelete.addEventListener('touchend', clearInt);
DOM.btnDelete.addEventListener('touchcancel', clearInt);

// القائمة (تعتمد على SURAHS_INDEX من الملف الخارجي)
function openSurahList() {
  DOM.surahListContainer.innerHTML = '';
  if (typeof SURAHS_INDEX !== 'undefined') {
    SURAHS_INDEX.forEach(s => {
      const item = document.createElement('div');
      item.className = 'surah-item';
      item.innerHTML = `<span>${s.name}</span><span>${s.ayahCount} آية</span>`;
      item.onclick = () => selectSurah(s);
      DOM.surahListContainer.appendChild(item);
    });
  }
  DOM.surahListModal.classList.add('open');
}

async function selectSurah(surahMeta) {
  const data = await loadSurah(surahMeta);
  if (data) {
    buildSurahDisplay(data);
    DOM.surahNameDisplay.textContent = surahMeta.name;
    DOM.surahListModal.classList.remove('open');
    DOM.screenHome.classList.remove('active');
    DOM.screenRecite.classList.add('active');
  }
}

function closeSurahList() {
  DOM.surahListModal.classList.remove('open');
}

function showToast(m) {
  DOM.toast.textContent = m;
  DOM.toast.classList.remove('hidden');
  clearTimeout(window.tOut);
  window.tOut = setTimeout(() => DOM.toast.classList.add('hidden'), 2500);
}

// التصدير للنافذة
window.toggleRecognition = toggleRecognition;
window.revealNextWord = revealNextWord;
window.openSurahList = openSurahList;
window.closeSurahList = closeSurahList;
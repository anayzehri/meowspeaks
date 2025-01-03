const TRANSLATION_MESSAGES = {
  hungry: {
    meow1: ["My bowl is tragically empty!", 85, "🍖"],
    meow2: ["Feed me, I'm wasting away!", 70, "🥣"],
    meow3: ["Is that food? For me?", 60, "🐾"],
  },
  affection: {
    purr1: ["Purrrr... you may pet me.", 90, "💖"],
    purr2: ["I tolerate your affection.", 75, "😽"],
    purr3: ["Head scratches are... acceptable.", 65, "😻"],
  },
  play: {
    meow1: ["The red dot! Engage!", 80, "🪀"],
    meow2: ["This toy mouse is my mortal enemy!", 70, "🐭"],
    meow3: ["Play with me, human!", 60, "🎾"],
  },
  demand: {
    meow1: ["Open the door, minion!", 95, "🚪"],
    meow2: ["I require your immediate attention!", 80, "😾"],
    meow3: ["Why is this door closed?!", 65, "😠"],
  },
  warning: {
    hiss1: ["Hssss! Back away slowly.", 90, "😾"],
    hiss2: ["I am displeased.", 80, "😡"],
    hiss3: ["That is MY spot!", 70, "💢"],
  },
  default: {
    meow1: ["Mrow? (Context unclear)", 50, "❓"],
  },
};

const CAT_FACTS = [
  "A cat's purr vibrates at a frequency of 25 to 150 Hertz.",
  "Cats can make over 100 different vocalizations.",
];

const LISTENING_MESSAGES = [
  "Listening intently...",
  "Analyzing feline vocalizations...",
  "Tuning into cat frequencies...",
  "Processing meows and purrs...",
  "Detecting subtle purr-turbations...",
];
const ANALYSIS_MESSAGES = ["Analyzing sound...", "Decoding audio...", "Identifying sound patterns..."];

const recordBtn = document.getElementById("recordBtn");
const listeningIndicator = document.getElementById("listeningIndicator");
const translationOutput = document.getElementById("translationOutput");
const catFactDiv = document.getElementById("catFact");
const contextSelect = document.getElementById("context");
const confidenceLevelDiv = document.getElementById("confidenceLevel");
const analysisMessageDiv = document.getElementById("analysisMessage");
const waveformCanvas = document.getElementById("waveformCanvas");
const soundLevelVisualizer = document.getElementById("soundLevel");
const meowTypeIcon = document.getElementById("meowTypeIcon");
const canvasCtx = waveformCanvas.getContext('2d');
const blogHeader = document.getElementById('blogHeader');

let listeningMessageIndex = 0;
let listeningInterval;
let animationFrameId;
let audioStream;
let analyser;
let audioDataArray;
let audioContext;
let speechSynth;
let femaleVoice;
let usageCount = 0;
const maxUsage = 5;
let adButton;
let adRequired = false;
let meydaAnalyzer;

// Initialize Web Speech API
if('speechSynthesis' in window){
  speechSynth = window.speechSynthesis;
  // Get all the voices
    speechSynth.onvoiceschanged = () => {
    const voices = speechSynth.getVoices();
      femaleVoice = voices.find(voice => voice.name.toLowerCase().includes('female')) || voices[0]
    }
} else {
  alert("Text-to-speech not supported in your browser");
}

// Initialize Audio Context and Stream at start up
async function initializeAudioAndSpeech(){
  try{
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(audioStream);
        analyser = audioContext.createAnalyser();
        source.connect(analyser);

        analyser.fftSize = 2048;
        const bufferLength = analyser.frequencyBinCount;
         audioDataArray = new Uint8Array(bufferLength);

       meydaAnalyzer = Meyda.createMeydaAnalyzer({
            audioContext: audioContext,
            source: source,
              bufferSize: 512,
            featureExtractors: ["spectralCentroid", "mfcc", "energy", "zcr"]
        });
       meydaAnalyzer.start();


        function analyzeAudio() {
            if (!analyser) return;
            analyser.getByteFrequencyData(audioDataArray);
            const averageAmplitude = audioDataArray.reduce((sum,value) => sum + value, 0) / audioDataArray.length;
             const normalizedAmplitude = averageAmplitude / 255;
            if (soundLevelVisualizer && soundLevelVisualizer.classList.contains('active')) {
                  soundLevelVisualizer.style.setProperty('--level', normalizedAmplitude);

            }
            animationFrameId = requestAnimationFrame(analyzeAudio);
        }
          analyzeAudio();
  }
    catch(error){
        console.error("Error initializing audio:", error)
    }
}
initializeAudioAndSpeech();

//Load Usage Counter
 function loadUsage(){
    const storedUsage = localStorage.getItem("usageCount");
    if(storedUsage) {
        usageCount = parseInt(storedUsage, 10)
    }
 }
 loadUsage();

recordBtn.addEventListener("click", handleRecordButtonClick);

function handleRecordButtonClick(){
    if (adRequired) {
       showAdPrompt();
       return;
   }
   startRecording();
}
async function startRecording() {
  recordBtn.classList.add("recording");
  soundLevelVisualizer.classList.add("active");
  listeningIndicator.classList.add("listening");
  translationOutput.classList.remove("show");
  catFactDiv.classList.remove("show");
  analysisMessageDiv.classList.remove("show");
  confidenceLevelDiv.classList.remove("show");
  waveformCanvas.classList.remove("active");
  meowTypeIcon.textContent = "";
  listeningMessageIndex = 0;
  listeningIndicator.textContent = LISTENING_MESSAGES[listeningMessageIndex];
  listeningInterval = setInterval(cycleListeningMessages, 800);
    setTimeout(startAnalysis, 2000);
}

function showAdPrompt(){
     translationOutput.textContent = `Please watch an add to continue`;
  translationOutput.classList.add("show");
     adButton = document.createElement('button');
     adButton.textContent = "Click here to see an ad";
    adButton.className = "ad-button";
     adButton.addEventListener("click", resetUsage);
     translationOutput.appendChild(adButton);
}

function resetUsage(){
    adRequired = false;
    translationOutput.classList.remove('show');
    translationOutput.innerHTML = "";
    if (audioStream){
      audioStream.getTracks().forEach(track => track.stop());
      audioStream = null;
   }
   if(meydaAnalyzer){
     meydaAnalyzer.stop();
    meydaAnalyzer = null
    }
       initializeAudioAndSpeech()
}

function startAnalysis() {
  clearInterval(listeningInterval);
  listeningIndicator.classList.remove("listening");
  listeningIndicator.textContent = "";
  analysisMessageDiv.textContent = ANALYSIS_MESSAGES[0];
  analysisMessageDiv.classList.add("show");
  waveformCanvas.classList.add("active");
  drawWaveform(); // Start drawing the waveform
  setTimeout(stopRecording, 2000);
}
function stopRecording() {
  recordBtn.classList.remove("recording");
  soundLevelVisualizer.classList.remove("active");
  waveformCanvas.classList.remove("active");
  analysisMessageDiv.classList.remove("show");
  cancelAnimationFrame(animationFrameId);
  canvasCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
    if (audioStream) {
        // audioStream.getTracks().forEach(track => track.stop());
     }
  analyser = null;
   try{
       const features = meydaAnalyzer.get();
        const spectralCentroid = features ? features.spectralCentroid : 0;
        const mfcc = features ? features.mfcc : [];
        const energy = features ? features.energy : 0;
       const zcr = features ? features.zcr : 0;


        const mfccSum = mfcc.reduce((sum, val) => sum + Math.abs(val), 0);
        const isCatSound =
            spectralCentroid > 500 &&
           spectralCentroid < 6000 &&
            energy > 0.08 &&
            mfccSum > 5 &&
           zcr > 0.03 &&
           zcr < 0.45;


        if (isCatSound) {
           if(usageCount >= maxUsage){
               adRequired = true;
               showAdPrompt();
              return;
          }
            displayTranslation();
            displayCatFact();
            usageCount++;
           localStorage.setItem("usageCount", usageCount);
        } else {
         const notCatMessages = ["I think I heard something, but it's not a cat!",
                "That doesn't sound like a cat to me...",
                "Is that a cat? I'm not so sure!",
                 "Hmm, I'm not sure that's a cat sound."
        ];
           translationOutput.textContent = notCatMessages[Math.floor(Math.random() * notCatMessages.length)];
          translationOutput.classList.add("show");
       }

    } catch (error) {
        console.error("Error in meow detection", error);
       const notCatMessages = ["Something went wrong... please try again.", "Sorry, I couldn't hear anything...", "It seems something is not working..."];
      translationOutput.textContent = notCatMessages[Math.floor(Math.random() * notCatMessages.length)];
        translationOutput.classList.add("show");

    }
}

function cycleListeningMessages() {
  listeningMessageIndex = (listeningMessageIndex + 1) % LISTENING_MESSAGES.length;
  listeningIndicator.textContent = LISTENING_MESSAGES[listeningMessageIndex];
}

function displayTranslation() {
  const selectedContext = contextSelect.value;
  const translations =
    TRANSLATION_MESSAGES[selectedContext] || TRANSLATION_MESSAGES.default;
  const meowTypes = Object.keys(translations);
  const randomMeowType = meowTypes[Math.floor(Math.random() * meowTypes.length)];
  const [translation, confidence, icon] = translations[randomMeowType];
  translationOutput.textContent = translation;
  confidenceLevelDiv.textContent = `Confidence: ${confidence}%`;
  meowTypeIcon.textContent = icon;
  translationOutput.classList.add("show");
  confidenceLevelDiv.classList.add("show");
  speakTranslation(translation); // Speak the translation
}

function displayCatFact() {
  const randomIndex = Math.floor(Math.random() * CAT_FACTS.length);
  catFactDiv.textContent = "Fun Cat Fact: " + CAT_FACTS[randomIndex];
  catFactDiv.classList.add("show");
}

function drawWaveform() {
  canvasCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
  canvasCtx.fillStyle = "#457b9d";
  let x = 0;
  const amplitude = waveformCanvas.height / 2;
  const frequency = 0.05; // Adjust to get different speeds
  const offset = amplitude;

  function animate() {
    canvasCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
    canvasCtx.beginPath();
    for (let i = 0; i < waveformCanvas.width; i++) {
      const y = amplitude * Math.sin((x + i) * frequency) + offset;
      canvasCtx.lineTo(i, y);
    }
    canvasCtx.stroke();
    x += 1.2;
    animationFrameId = requestAnimationFrame(animate);
  }
  animate();
}
function speakTranslation(text){
    if(!speechSynth) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = femaleVoice;
    speechSynth.speak(utterance);
}
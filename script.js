/********************************
 * REPLACE WITH YOUR REAL API KEY
********************************/
const OPENAI_API_KEY = "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"; // <== Put your real key here

/********************************
 * THREE.JS SCENE (Background)
 ********************************/
const bgCanvas = document.getElementById("bgCanvas");
const renderer = new THREE.WebGLRenderer({ canvas: bgCanvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1, 5);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.autoRotate = true; // default ON
controls.autoRotateSpeed = 10.0;

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(2, 5, 3);
scene.add(directionalLight);

// Load trump.glb
const loader = new THREE.GLTFLoader();
loader.load(
  "trump.glb",
  (gltf) => {
    const model = gltf.scene;
    scene.add(model);

    // Center & scale
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Move model so center is at (0,0,0)
    model.position.x -= center.x;
    model.position.y -= center.y;
    model.position.z -= center.z;

    // Scale it
    const maxDim = Math.max(size.x, size.y, size.z);
    const desiredSize = 30;
    const scaleFactor = desiredSize / maxDim;
    model.scale.set(scaleFactor, scaleFactor, scaleFactor);

    // Recompute bounding sphere
    const boxPostScale = new THREE.Box3().setFromObject(model);
    const sphere = new THREE.Sphere();
    boxPostScale.getBoundingSphere(sphere);

    // Position camera so the model is nicely framed
    camera.position.set(sphere.center.x, sphere.center.y + 1, sphere.radius * 3);
    controls.target.copy(sphere.center);
  },
  undefined,
  (error) => {
    console.error(error);
  }
);

// Resize event
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// Animate
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

/********************************
 * ROTATION UI
 ********************************/
const autoRotateCheckbox = document.getElementById("autoRotateCheckbox");
autoRotateCheckbox.addEventListener("change", (e) => {
  controls.autoRotate = e.target.checked;
});

const rotationSpeedSlider = document.getElementById("rotationSpeedSlider");
const speedValueSpan = document.getElementById("speedValue");
rotationSpeedSlider.addEventListener("input", (e) => {
  const speed = parseFloat(e.target.value);
  controls.autoRotateSpeed = speed;
  speedValueSpan.textContent = speed.toFixed(1);
});

/********************************
 * RADIO LOGIC (song.mp3) - loop & reset
 ********************************/
const myAudio = document.getElementById("myAudio");
const radioPlay = document.getElementById("radioPlay");
const radioStop = document.getElementById("radioStop");
const radioReset = document.getElementById("radioReset");

// Because "Play" is checked by default, attempt auto-play on load
window.addEventListener("DOMContentLoaded", () => {
  myAudio.play().catch((err) => console.log("Autoplay blocked by browser:", err));
});

// "Play"
radioPlay.addEventListener("change", () => {
  if (radioPlay.checked) {
    myAudio.play().catch((err) => console.log(err));
  }
});
// "Stop"
radioStop.addEventListener("change", () => {
  if (radioStop.checked) {
    myAudio.pause();
    myAudio.currentTime = 0;
  }
});
// "Reset": start from beginning AND play
radioReset.addEventListener("change", () => {
  if (radioReset.checked) {
    myAudio.currentTime = 0;
    myAudio.play().catch((err) => console.log(err));
  }
});
// We'll loop the audio
myAudio.loop = true;

/********************************
 * TRUMP-STYLE CHATBOT via ChatGPT API
 ********************************/
const chatbotMessages = document.getElementById("chatbotMessages");
const chatbotInput = document.getElementById("chatbotInput");
const chatbotSend = document.getElementById("chatbotSend");

/**
 * Calls the OpenAI Chat Completion endpoint with a system instruction
 * that the AI should talk like Donald Trump.
 */
async function fetchTrumpResponse(userMessage) {
  const systemPrompt = `You are Donald J. Trump, the 45th President of the United States.
  Respond in the style of Donald Trump with confidence, informal phrasing, 
  and references to your typical speaking mannerisms. 
  Keep it somewhat comedic, but avoid hateful or extremist content.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // or whichever model you'd like
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 200,
        temperature: 0.9,
      }),
    });

    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content.trim();
    } else {
      console.error("OpenAI API Error:", data);
      return "Sorry, something went wrong with OpenAI.";
    }
  } catch (err) {
    console.error("Fetch Error:", err);
    return "Sorry, I couldn't connect to OpenAI.";
  }
}

/**
 * Renders a message bubble in the chat UI.
 */
function addMessage(text, sender) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", sender);

  const bubble = document.createElement("div");
  bubble.classList.add("bubble");
  bubble.innerText = text;

  msgDiv.appendChild(bubble);
  chatbotMessages.appendChild(msgDiv);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

/**
 * Handles sending a new message from user input.
 */
async function handleSend() {
  const userMessage = chatbotInput.value.trim();
  if (!userMessage) return;

  // Show user message
  addMessage(userMessage, "user");
  chatbotInput.value = "";

  // Show "typing..." or a small delay
  setTimeout(async () => {
    // Call the ChatGPT API
    const trumpReply = await fetchTrumpResponse(userMessage);
    addMessage(trumpReply, "bot");
  }, 600);
}

// Send button & Enter key
chatbotSend.addEventListener("click", handleSend);
chatbotInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleSend();
  }
});

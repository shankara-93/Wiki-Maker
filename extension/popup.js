const $ = (id) => document.getElementById(id);

let settings = { apiUrl: "", authToken: "", wikiUrl: "" };

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  settings = await loadSettings();

  // Show current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    $("pageTitle").textContent = tab.title || "Untitled";
    $("pageUrl").textContent = tab.url || "";
  }

  // Show user email from JWT (decode without verify — display only)
  if (settings.authToken) {
    try {
      const payload = JSON.parse(atob(settings.authToken.split(".")[1]));
      $("userEmail").textContent = payload.email || "";
    } catch {}
  }
}

// ── Settings ──────────────────────────────────────────────────────────────────

async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["apiUrl", "authToken", "wikiUrl"], (data) => {
      resolve({
        apiUrl: data.apiUrl || "",
        authToken: data.authToken || "",
        wikiUrl: data.wikiUrl || "",
      });
    });
  });
}

$("settingsToggle").addEventListener("click", () => {
  const panel = $("settingsPanel");
  const isOpen = panel.classList.contains("open");
  panel.classList.toggle("open", !isOpen);
  $("settingsToggle").textContent = isOpen ? "⚙ Settings" : "✕ Close";

  if (!isOpen) {
    $("apiUrl").value = settings.apiUrl;
    $("authToken").value = settings.authToken;
    $("wikiUrl").value = settings.wikiUrl;
  }
});

$("saveSettings").addEventListener("click", () => {
  settings = {
    apiUrl: $("apiUrl").value.trim().replace(/\/$/, ""),
    authToken: $("authToken").value.trim(),
    wikiUrl: $("wikiUrl").value.trim().replace(/\/$/, ""),
  };
  chrome.storage.local.set(settings, () => {
    $("saveSettings").textContent = "✓ Saved!";
    setTimeout(() => {
      $("saveSettings").textContent = "Save Settings";
      $("settingsPanel").classList.remove("open");
      $("settingsToggle").textContent = "⚙ Settings";
    }, 1200);
  });
});

// ── Capture ───────────────────────────────────────────────────────────────────

$("captureBtn").addEventListener("click", async () => {
  if (!settings.apiUrl) {
    showError("Please set your API URL in Settings first.");
    return;
  }
  if (!settings.authToken) {
    showError("Please set your Auth Token in Settings first.");
    return;
  }

  setLoading(true, "Extracting page content...");

  // Small delay to let status show
  await new Promise((r) => setTimeout(r, 50));

  $("statusLoadingText").textContent = "Processing with AI... (10-20s)";

  chrome.runtime.sendMessage(
    {
      type: "CAPTURE_PAGE",
      apiUrl: settings.apiUrl,
      token: settings.authToken,
    },
    (response) => {
      setLoading(false);
      if (chrome.runtime.lastError) {
        showError(chrome.runtime.lastError.message);
        return;
      }
      if (!response?.success) {
        showError(response?.error || "Unknown error occurred");
        return;
      }
      showResult(response.data);
    }
  );
});

// ── UI helpers ────────────────────────────────────────────────────────────────

function setLoading(on, text = "Processing...") {
  $("captureBtn").disabled = on;
  $("statusLoading").style.display = on ? "flex" : "none";
  if (on) {
    $("statusLoadingText").textContent = text;
    $("statusSuccess").style.display = "none";
    $("statusError").style.display = "none";
    $("resultCard").classList.remove("show");
  }
}

function showError(msg) {
  $("statusError").textContent = "✗ " + msg;
  $("statusError").style.display = "block";
}

function showResult(wiki) {
  $("statusSuccess").textContent = "✓ Saved to your wiki vault!";
  $("statusSuccess").style.display = "block";

  $("resultTitle").textContent = wiki.title || "Untitled";
  $("resultCategory").textContent = "📂 " + (wiki.category || "Other");
  $("resultSummary").textContent = wiki.summary || "";
  $("resultCard").classList.add("show");

  if (settings.wikiUrl && wiki.id) {
    $("openWiki").addEventListener("click", () => {
      chrome.tabs.create({ url: `${settings.wikiUrl}/wiki/${wiki.id}` });
    });
  } else {
    $("openWiki").style.display = "none";
  }
}

init();

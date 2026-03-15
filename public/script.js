const form = document.getElementById("search-form");
const statusMessage = document.getElementById("status-message");
const resultsTable = document.getElementById("results-table");
const resultsBody = document.getElementById("results-body");
const locationBtn = document.getElementById("location-btn");
const latitudeInput = document.getElementById("latitude");
const longitudeInput = document.getElementById("longitude");
const cepInput = document.getElementById("cep");
const cepLookupBtn = document.getElementById("cep-lookup-btn");
const submitBtn = document.getElementById("submit-btn");
const CEP_LOOKUP_DELAY_MS = 400;

function createDebounce(fn, wait) {
  let timeoutId;

  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), wait);
  };
}

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

const debouncedLookupCep = createDebounce((cep) => {
  lookupCep(cep);
}, CEP_LOOKUP_DELAY_MS);

// Máscara de CEP e funcionalidade de busca automática
if (cepInput) {
  cepInput.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, "");

    if (value.length > 5) {
      value = value.slice(0, 5) + "-" + value.slice(5, 8);
    }

    e.target.value = value;

    // Aciona busca automática quando o CEP estiver completo (8 dígitos)
    const cleanCep = value.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      debouncedLookupCep(cleanCep);
    }
  });
}

// Função de busca de CEP via AwesomeAPI
async function lookupCep(cep) {
  if (!cep || cep.length !== 8) {
    setStatus("CEP deve conter 8 dígitos.", true);
    return;
  }

  setStatus("Buscando localização pelo CEP...");
  if (cepLookupBtn) {
    cepLookupBtn.disabled = true;
    cepLookupBtn.textContent = "⏳";
  }

  try {
    const response = await fetch(`https://cep.awesomeapi.com.br/json/${cep}`);

    if (!response.ok) {
      throw new Error("CEP não encontrado.");
    }

    const data = await response.json();

    // Tratamento de respostas de erro da API
    if (data.code === "not_found" || data.error) {
      throw new Error(data.message || data.error || "CEP não encontrado.");
    }

    if (data.lat == null || data.lng == null) {
      throw new Error("Coordenadas não encontradas para o CEP informado.");
    }

    // Preenche os campos de coordenadas
    latitudeInput.value = data.lat;
    longitudeInput.value = data.lng;

    // Exibe mensagem de sucesso com nome da localização
    const locationParts = [
      data.city && data.state ? `${data.city} - ${data.state}` : (data.city || data.state),
      [data.address_type, data.address_name].filter(Boolean).join(" "),
    ].filter(Boolean);

    const locationName = locationParts.join(", ") || "Localização identificada";
    setStatus(`Localização encontrada: ${locationName}`);

  } catch (error) {
    setStatus(error.message || "Erro ao buscar CEP. Tente novamente.", true);
  } finally {
    if (cepLookupBtn) {
      cepLookupBtn.disabled = false;
      cepLookupBtn.textContent = "🔍";
    }
  }
}

// Acionamento manual do botão de busca de CEP
if (cepLookupBtn) {
  cepLookupBtn.addEventListener("click", () => {
    const cep = cepInput ? cepInput.value.replace(/\D/g, "") : "";
    if (cep.length !== 8) {
      setStatus("CEP deve conter 8 dígitos.", true);
      return;
    }
    lookupCep(cep);
  });
}

function safe(str) {
  if (str == null) return "N/A";
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

function renderDevices(devices) {
  resultsBody.innerHTML = "";

  devices.forEach((device) => {
    const distance = Number.isFinite(device.distance)
      ? `${device.distance.toFixed(1)} km`
      : "N/A";

    const row = document.createElement("tr");

    const typeTd = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `badge badge-${device.type.toLowerCase().replace(/\s/g, '-')}`;
    badge.textContent = device.type;
    typeTd.appendChild(badge);

    const ipTd = document.createElement("td");
    ipTd.textContent = device.ip;

    const portTd = document.createElement("td");
    portTd.textContent = device.port;

    const distTd = document.createElement("td");
    distTd.textContent = distance;

    const locTd = document.createElement("td");
    locTd.textContent = `${device.city}, ${device.country}`;

    const orgTd = document.createElement("td");
    orgTd.textContent = device.organization;

    const linkTd = document.createElement("td");
    const anchor = document.createElement("a");
    anchor.href = device.url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.className = "btn-link";
    anchor.textContent = "Abrir ↗";
    linkTd.appendChild(anchor);

    row.append(typeTd, ipTd, portTd, distTd, locTd, orgTd, linkTd);
    resultsBody.appendChild(row);
  });

  resultsTable.hidden = devices.length === 0;
}

// Funcionalidade de geolocalização
if (locationBtn) {
  locationBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      setStatus("Geolocalização não é suportada pelo seu navegador.", true);
      return;
    }

    setStatus("Obtendo sua localização...");
    locationBtn.disabled = true;
    locationBtn.textContent = "⏳";

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        latitudeInput.value = latitude.toFixed(6);
        longitudeInput.value = longitude.toFixed(6);
        setStatus(`Localização obtida: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        locationBtn.disabled = false;
        locationBtn.textContent = "📍";
      },
      (error) => {
        let message = "Erro ao obter localização.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Permissão de localização negada. Por favor, permita o acesso à localização.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Informação de localização indisponível.";
            break;
          case error.TIMEOUT:
            message = "Tempo esgotado ao obter localização.";
            break;
        }
        setStatus(message, true);
        locationBtn.disabled = false;
        locationBtn.textContent = "📍";
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

function setSubmitLoading(isLoading) {
  if (!submitBtn) return;
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? "Buscando..." : "Buscar dispositivos";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = {
    latitude: Number(formData.get("latitude")),
    longitude: Number(formData.get("longitude")),
    radius: Number(formData.get("radius")),
  };

  setStatus("Buscando dispositivos...");
  setSubmitLoading(true);
  resultsTable.hidden = true;
  resultsBody.innerHTML = "";

  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Nao foi possivel concluir a busca.");
    }

    if (!data.devices || data.devices.length === 0) {
      setStatus(
        "Nenhum dispositivo foi encontrado para essa area. Tente ampliar o raio.",
        true
      );
      renderDevices([]);
      return;
    }

    renderDevices(data.devices);
    setStatus(`${data.devices.length} dispositivo(s) encontrado(s).`);
  } catch (error) {
    setStatus(error.message || "Erro ao buscar dispositivos.", true);
    renderDevices([]);
  } finally {
    setSubmitLoading(false);
  }
});

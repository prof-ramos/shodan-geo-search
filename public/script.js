const form = document.getElementById("search-form");
const statusMessage = document.getElementById("status-message");
const resultsTable = document.getElementById("results-table");
const resultsBody = document.getElementById("results-body");

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

function renderDevices(devices) {
  resultsBody.innerHTML = "";

  devices.forEach((device) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${device.ip}</td>
      <td>${device.organization}</td>
      <td>${device.port}</td>
    `;
    resultsBody.appendChild(row);
  });

  resultsTable.hidden = devices.length === 0;
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
  }
});

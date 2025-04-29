let ws;
let isCharging = false;
let batteryPercent = 0;
let meterStart = 0;
let voltage = 230; // typical EVSE
let current = 0;
let power = 0;
let energyDelivered = 0;
let meterInterval;

document.getElementById('connectBtn').addEventListener('click', connectWS);
document.getElementById('sendBtn').addEventListener('click', sendOCPP);

function connectWS() {
  const wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${wsProtocol}://${location.hostname}:9000`);

  ws.onopen = () => {
    document.getElementById('wsStatus').textContent = 'Connected';
    log('✅ WebSocket connected');
  };

  ws.onclose = () => {
    document.getElementById('wsStatus').textContent = 'Disconnected';
    log('❌ WebSocket disconnected');
    stopChargingSimulation();
  };

  ws.onmessage = (e) => {
    const res = JSON.parse(e.data);
    log(`📥 Received: ${JSON.stringify(res, null, 2)}`);

    if (res[2]?.transactionId) {
      startChargingSimulation();
    } else if (res[2]?.idTagInfo?.status === 'Accepted') {
      document.getElementById('chargingStatus').textContent = 'Authorized';
    }
  };
}

function sendOCPP() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    log('❌ WebSocket not connected');
    return;
  }

  const action = document.getElementById('messageType').value;
  const input = document.getElementById('extraData').value;
  const uniqueID = crypto.randomUUID();

  let payload = {};

  switch(action) {
    case 'Heartbeat':
      payload = {};
      break;
    case 'BootNotification':
      payload = { chargePointVendor: 'EVBrand', chargePointModel: 'ModelX' };
      break;
    case 'Authorize':
      payload = { idTag: input || 'ABC123' };
      break;
    case 'StartTransaction':
      payload = { connectorId: 1, idTag: input || 'ABC123', meterStart: 0, timestamp: new Date().toISOString() };
      break;
    case 'StopTransaction':
      payload = { transactionId: parseInt(input) || 1, meterStop: Math.floor(energyDelivered), timestamp: new Date().toISOString(), idTag: "ABC123" };
      stopChargingSimulation();
      break;
  }

  const message = { messageType: 2, uniqueID, action, payload };
  ws.send(JSON.stringify(message));
  log(`📤 Sent: ${JSON.stringify(message, null, 2)}`);
}

function startChargingSimulation() {
  isCharging = true;
  batteryPercent = 0;
  energyDelivered = 0;
  document.getElementById('chargingStatus').textContent = '⚡ Load Active';

  meterInterval = setInterval(() => {
    if (batteryPercent < 100) {
      current = (Math.random() * 15 + 5).toFixed(1); // 5A to 20A
      power = (voltage * current).toFixed(0);        // W = V × A
      batteryPercent += 1;
      energyDelivered += (power / 3600000) * 1;       // kWh = (Watt x sec)/3600000

      updateChargingUI();
    } else {
      stopChargingSimulation();
    }
  }, 1000);
}

function stopChargingSimulation() {
  clearInterval(meterInterval);
  current = 0;
  power = 0;
  isCharging = false;
  document.getElementById('chargingStatus').textContent = '🛑 No Load';
  updateChargingUI();
}

function updateChargingUI() {
  document.getElementById('batteryFill').style.width = `${batteryPercent}%`;
  document.getElementById('batteryPercent').textContent = batteryPercent;
  document.getElementById('voltageValue').textContent = voltage;
  document.getElementById('currentValue').textContent = current;
  document.getElementById('powerValue').textContent = power;
  document.getElementById('energyValue').textContent = energyDelivered.toFixed(2);
}

function log(msg) {
  const logEl = document.getElementById('log');
  logEl.textContent += `${msg}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}
const ws = new WebSocket('ws://localhost:9000');
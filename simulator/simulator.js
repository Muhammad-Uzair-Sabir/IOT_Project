import mqtt from "mqtt";

const MQTT_URL = process.env.MQTT_URL || "mqtt://127.0.0.1:1883";

const devices = [
  { topic: "home/ac", min: 800, max: 2800 },
  { topic: "home/lights", min: 40, max: 400 },
  { topic: "home/fridge", min: 80, max: 220 },
];

function randBetween(a, b) {
  return a + Math.random() * (b - a);
}

function nextDelayMs() {
  return Math.floor(randBetween(2000, 5000));
}

const client = mqtt.connect(MQTT_URL);

client.on("connect", () => {
  console.log("Simulator connected to MQTT");
  devices.forEach(schedulePublish);
});

client.on("error", (e) => console.error("Simulator MQTT error", e));

function schedulePublish(dev) {
  const watts = randBetween(dev.min, dev.max);
  const payload = JSON.stringify({
    energyValue: Math.round(watts * 10) / 10,
    unit: "watts",
  });
  client.publish(dev.topic, payload, { qos: 0 }, (err) => {
    if (err) console.error(err);
  });
  setTimeout(() => schedulePublish(dev), nextDelayMs());
}

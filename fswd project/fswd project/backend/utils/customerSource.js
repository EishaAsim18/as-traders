const CUSTOMER_SOURCES = ["online", "walk-in"];
const DELIVERY_FEE_ONLINE = 1200;

const SOURCE_LABELS = {
  online: "Online",
  "walk-in": "Walk-in",
};

function sourceLabel(source) {
  return SOURCE_LABELS[source] || source;
}

function deliveryFeeForSource(source, includeDelivery) {
  if (source === "online") return DELIVERY_FEE_ONLINE;
  return includeDelivery ? DELIVERY_FEE_ONLINE : 0;
}

module.exports = {
  CUSTOMER_SOURCES,
  DELIVERY_FEE_ONLINE,
  SOURCE_LABELS,
  sourceLabel,
  deliveryFeeForSource,
};
